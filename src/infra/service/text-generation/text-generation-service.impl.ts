import { generateText, streamText, type LanguageModel } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import type { TextGenerationService } from "./text-generation-service.js";
import type {
  TextGenerationConfig,
  TextGenerationResult,
  TextStreamResult,
  ModelConfig,
} from "./types.js";

/**
 * Implementation of TextGenerationService using Vercel AI SDK
 */
export class VercelAITextGenerationService implements TextGenerationService {
  private readonly model: LanguageModel;

  /**
   * Creates a new instance of VercelAITextGenerationService
   * @param modelOrConfig - Either a pre-configured LanguageModel or ModelConfig to create one
   * @param defaultConfig - Default configuration to apply to all requests
   */
  constructor(
    modelOrConfig: LanguageModel | ModelConfig,
    private readonly defaultConfig: TextGenerationConfig = {}
  ) {
    // Check if it's a ModelConfig or a LanguageModel
    if (this.isModelConfig(modelOrConfig)) {
      this.model = this.createModelFromConfig(modelOrConfig);
    } else {
      this.model = modelOrConfig;
    }
  }

  /**
   * Type guard to check if the input is a ModelConfig
   * @param input - The input to check
   * @returns True if input is ModelConfig
   */
  private isModelConfig(
    input: LanguageModel | ModelConfig
  ): input is ModelConfig {
    return (
      typeof input === "object" &&
      input !== null &&
      "provider" in input &&
      "modelId" in input &&
      "config" in input
    );
  }

  /**
   * Creates a LanguageModel from ModelConfig
   * @param modelConfig - Configuration for creating the model
   * @returns Configured LanguageModel
   */
  private createModelFromConfig(modelConfig: ModelConfig): LanguageModel {
    switch (modelConfig.provider) {
      case "openai": {
        const provider = createOpenAI({
          apiKey: modelConfig.config.apiKey,
          ...(modelConfig.config.baseURL && {
            baseURL: modelConfig.config.baseURL,
          }),
          ...(modelConfig.config.organization && {
            organization: modelConfig.config.organization,
          }),
          ...(modelConfig.config.project && {
            project: modelConfig.config.project,
          }),
          ...(modelConfig.config.headers && {
            headers: modelConfig.config.headers,
          }),
        });
        return provider(modelConfig.modelId);
      }
      // Add support for other providers as needed
      // case "anthropic": {
      //   const provider = createAnthropic({
      //     apiKey: modelConfig.config.apiKey,
      //     ...(modelConfig.config.baseURL && {
      //       baseURL: modelConfig.config.baseURL,
      //     }),
      //   });
      //   return provider(modelConfig.modelId);
      // }
      default:
        throw new Error(
          `Unsupported provider: ${modelConfig.provider}. Please pass a pre-configured LanguageModel instead.`
        );
    }
  }

  /**
   * Generates text synchronously using the Vercel AI SDK
   * @param prompt - The input prompt for text generation
   * @param config - Optional configuration to override defaults
   * @returns Promise resolving to the complete generation result
   */
  async generateText(
    prompt: string,
    config?: TextGenerationConfig
  ): Promise<TextGenerationResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const result = await generateText({
      model: this.model,
      prompt,
      ...(mergedConfig.temperature !== undefined && {
        temperature: mergedConfig.temperature,
      }),
      ...(mergedConfig.maxTokens !== undefined && {
        maxTokens: mergedConfig.maxTokens,
      }),
      ...(mergedConfig.topP !== undefined && { topP: mergedConfig.topP }),
      ...(mergedConfig.frequencyPenalty !== undefined && {
        frequencyPenalty: mergedConfig.frequencyPenalty,
      }),
      ...(mergedConfig.presencePenalty !== undefined && {
        presencePenalty: mergedConfig.presencePenalty,
      }),
      ...(mergedConfig.headers !== undefined && {
        headers: mergedConfig.headers,
      }),
      ...(mergedConfig.stopSequences !== undefined && {
        stopSequences: mergedConfig.stopSequences,
      }),
    });

    return this.adaptGenerateTextResult(result);
  }

  /**
   * Generates text as a stream using the Vercel AI SDK
   * @param prompt - The input prompt for text generation
   * @param config - Optional configuration to override defaults
   * @returns Promise resolving to a stream result with async iterator and metadata
   */
  async streamText(
    prompt: string,
    config?: TextGenerationConfig
  ): Promise<TextStreamResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const result = await streamText({
      model: this.model,
      prompt,
      ...(mergedConfig.temperature !== undefined && {
        temperature: mergedConfig.temperature,
      }),
      ...(mergedConfig.maxTokens !== undefined && {
        maxTokens: mergedConfig.maxTokens,
      }),
      ...(mergedConfig.topP !== undefined && { topP: mergedConfig.topP }),
      ...(mergedConfig.frequencyPenalty !== undefined && {
        frequencyPenalty: mergedConfig.frequencyPenalty,
      }),
      ...(mergedConfig.presencePenalty !== undefined && {
        presencePenalty: mergedConfig.presencePenalty,
      }),
      ...(mergedConfig.headers !== undefined && {
        headers: mergedConfig.headers,
      }),
      ...(mergedConfig.stopSequences !== undefined && {
        stopSequences: mergedConfig.stopSequences,
      }),
    });

    return this.adaptStreamTextResult(result);
  }

  /**
   * Adapts Vercel AI SDK generateText result to domain entity
   * @param sdkResult - Result from AI SDK generateText
   * @returns Adapted TextGenerationResult
   */
  private adaptGenerateTextResult(sdkResult: any): TextGenerationResult {
    return {
      text: sdkResult.text,
      usage: {
        promptTokens: sdkResult.usage.promptTokens,
        completionTokens: sdkResult.usage.completionTokens,
        totalTokens: sdkResult.usage.totalTokens,
      },
      finishReason: this.mapFinishReason(sdkResult.finishReason),
      model: this.extractModel(sdkResult),
    };
  }

  /**
   * Adapts Vercel AI SDK streamText result to domain entity
   * @param sdkResult - Result from AI SDK streamText
   * @returns Adapted TextStreamResult
   */
  private adaptStreamTextResult(sdkResult: any): TextStreamResult {
    const stream = this.createAsyncIterator(sdkResult.textStream);
    const metadata = (async () => {
      const [usage, finishReason, providerMetadata] = await Promise.all([
        sdkResult.usage,
        sdkResult.finishReason,
        sdkResult.experimental_providerMetadata,
      ]);

      return {
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
        finishReason: this.mapFinishReason(finishReason),
        model: this.extractModelFromProviderMetadata(providerMetadata),
      };
    })();

    return {
      stream,
      metadata,
    };
  }

  /**
   * Creates an async iterator from the SDK's text stream
   * @param textStream - The text stream from AI SDK
   * @returns AsyncIterableIterator yielding text chunks
   */
  private async *createAsyncIterator(
    textStream: AsyncIterable<string>
  ): AsyncIterableIterator<string> {
    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  /**
   * Maps AI SDK finish reasons to domain finish reasons
   * @param sdkFinishReason - Finish reason from AI SDK
   * @returns Mapped finish reason
   */
  private mapFinishReason(
    sdkFinishReason: string
  ): TextGenerationResult["finishReason"] {
    switch (sdkFinishReason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content-filter":
        return "content-filter";
      case "error":
        return "error";
      default:
        return "other";
    }
  }

  /**
   * Extracts model identifier from SDK result
   * @param sdkResult - Result from AI SDK
   * @returns Model identifier
   */
  private extractModel(sdkResult: any): string {
    return this.extractModelFromProviderMetadata(
      sdkResult.experimental_providerMetadata
    );
  }

  /**
   * Extracts model identifier from provider metadata
   * @param providerMetadata - Provider metadata from AI SDK
   * @returns Model identifier
   */
  private extractModelFromProviderMetadata(providerMetadata: any): string {
    // Try OpenAI first
    if (providerMetadata?.openai?.model) {
      return providerMetadata.openai.model;
    }

    // Could extend for other providers
    // if (providerMetadata?.anthropic?.model) {
    //   return providerMetadata.anthropic.model;
    // }

    return "unknown";
  }
}
