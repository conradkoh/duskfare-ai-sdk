import { describe, it, expect, vi, beforeEach } from "vitest";
import { VercelAITextGenerationService } from "./text-generation-service.impl.js";
import type { TextGenerationConfig, ModelConfig } from "./types.js";
import { generateText, streamText } from "ai";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock @ai-sdk/openai
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((modelId: string) => ({
    modelId,
    provider: "openai",
  })),
  createOpenAI: vi.fn((config: any) => {
    return (modelId: string) => ({
      modelId,
      provider: "openai",
      ...config,
    });
  }),
}));

describe("VercelAITextGenerationService", () => {
  let service: VercelAITextGenerationService;
  const mockModel = { modelId: "gpt-4" };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VercelAITextGenerationService(mockModel);
  });

  describe("generateText", () => {
    it("should generate text successfully with minimal config", async () => {
      // Arrange
      const prompt = "Hello, world!";
      const mockResponse = {
        text: "Generated response",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        finishReason: "stop",
        experimental_providerMetadata: {
          openai: {
            model: "gpt-4",
          },
        },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.generateText(prompt);

      // Assert
      expect(result).toEqual({
        text: "Generated response",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        finishReason: "stop",
        model: "gpt-4",
      });
      expect(generateText).toHaveBeenCalledWith({
        model: mockModel,
        prompt,
      });
    });

    it("should merge default config with provided config", async () => {
      // Arrange
      const defaultConfig: TextGenerationConfig = {
        temperature: 0.5,
        maxTokens: 100,
      };
      const serviceWithDefaults = new VercelAITextGenerationService(
        mockModel,
        defaultConfig
      );

      const prompt = "Test prompt";
      const overrideConfig: TextGenerationConfig = {
        temperature: 0.8,
        topP: 0.9,
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-4" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      await serviceWithDefaults.generateText(prompt, overrideConfig);

      // Assert
      expect(generateText).toHaveBeenCalledWith({
        model: mockModel,
        prompt,
        temperature: 0.8, // overridden
        maxTokens: 100, // from default
        topP: 0.9, // from override
      });
    });

    it("should map finish reasons correctly", async () => {
      // Arrange
      const testCases: Array<{
        sdkReason: string;
        expectedReason:
          | "stop"
          | "length"
          | "content-filter"
          | "error"
          | "other";
      }> = [
        { sdkReason: "stop", expectedReason: "stop" },
        { sdkReason: "length", expectedReason: "length" },
        { sdkReason: "content-filter", expectedReason: "content-filter" },
        { sdkReason: "error", expectedReason: "error" },
        { sdkReason: "unknown", expectedReason: "other" },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          text: "Response",
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
          finishReason: testCase.sdkReason,
          experimental_providerMetadata: { openai: { model: "gpt-4" } },
        };

        vi.mocked(generateText).mockResolvedValue(mockResponse as any);

        // Act
        const result = await service.generateText("test");

        // Assert
        expect(result.finishReason).toBe(testCase.expectedReason);
      }
    });

    it("should handle all config parameters", async () => {
      // Arrange
      const config: TextGenerationConfig = {
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 150,
        topP: 0.95,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-3.5-turbo" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      await service.generateText("test", config);

      // Assert
      expect(generateText).toHaveBeenCalledWith({
        model: mockModel,
        prompt: "test",
        temperature: 0.7,
        maxTokens: 150,
        topP: 0.95,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      });
    });

    it("should extract model from providerMetadata", async () => {
      // Arrange
      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: {
          openai: {
            model: "gpt-4-turbo",
          },
        },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.generateText("test");

      // Assert
      expect(result.model).toBe("gpt-4-turbo");
    });
  });

  describe("streamText", () => {
    it("should stream text successfully", async () => {
      // Arrange
      const prompt = "Stream this";
      const chunks = ["Hello", " ", "world", "!"];

      // Create mock async iterable
      const mockTextStream = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };

      const mockResponse = {
        textStream: mockTextStream,
        usage: Promise.resolve({
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        }),
        finishReason: Promise.resolve("stop"),
        experimental_providerMetadata: Promise.resolve({
          openai: {
            model: "gpt-4",
          },
        }),
      };

      vi.mocked(streamText).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.streamText(prompt);

      // Assert
      expect(streamText).toHaveBeenCalledWith({
        model: mockModel,
        prompt,
      });

      // Verify stream
      const collectedChunks: string[] = [];
      for await (const chunk of result.stream) {
        collectedChunks.push(chunk);
      }
      expect(collectedChunks).toEqual(chunks);

      // Verify metadata
      const metadata = await result.metadata;
      expect(metadata).toEqual({
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        finishReason: "stop",
        model: "gpt-4",
      });
    });

    it("should merge config for streaming", async () => {
      // Arrange
      const defaultConfig: TextGenerationConfig = {
        temperature: 0.5,
      };
      const serviceWithDefaults = new VercelAITextGenerationService(
        mockModel,
        defaultConfig
      );

      const config: TextGenerationConfig = {
        maxTokens: 200,
      };

      const mockTextStream = {
        async *[Symbol.asyncIterator]() {
          yield "test";
        },
      };

      const mockResponse = {
        textStream: mockTextStream,
        usage: Promise.resolve({
          promptTokens: 5,
          completionTokens: 10,
          totalTokens: 15,
        }),
        finishReason: Promise.resolve("stop"),
        experimental_providerMetadata: Promise.resolve({
          openai: { model: "gpt-4" },
        }),
      };

      vi.mocked(streamText).mockResolvedValue(mockResponse as any);

      // Act
      await serviceWithDefaults.streamText("test", config);

      // Assert
      expect(streamText).toHaveBeenCalledWith({
        model: mockModel,
        prompt: "test",
        temperature: 0.5,
        maxTokens: 200,
      });
    });

    it("should handle stream errors in metadata", async () => {
      // Arrange
      const mockTextStream = {
        async *[Symbol.asyncIterator]() {
          yield "partial";
        },
      };

      const mockResponse = {
        textStream: mockTextStream,
        usage: Promise.resolve({
          promptTokens: 5,
          completionTokens: 10,
          totalTokens: 15,
        }),
        finishReason: Promise.resolve("error"),
        experimental_providerMetadata: Promise.resolve({
          openai: { model: "gpt-4" },
        }),
      };

      vi.mocked(streamText).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.streamText("test");

      // Collect stream
      for await (const _chunk of result.stream) {
        // consume stream
      }

      const metadata = await result.metadata;

      // Assert
      expect(metadata.finishReason).toBe("error");
    });

    it("should map finish reasons in stream metadata", async () => {
      // Arrange
      const mockTextStream = {
        async *[Symbol.asyncIterator]() {
          yield "test";
        },
      };

      const mockResponse = {
        textStream: mockTextStream,
        usage: Promise.resolve({
          promptTokens: 5,
          completionTokens: 10,
          totalTokens: 15,
        }),
        finishReason: Promise.resolve("length"),
        experimental_providerMetadata: Promise.resolve({
          openai: { model: "gpt-4" },
        }),
      };

      vi.mocked(streamText).mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.streamText("test");
      for await (const _chunk of result.stream) {
        // consume
      }
      const metadata = await result.metadata;

      // Assert
      expect(metadata.finishReason).toBe("length");
    });
  });

  describe("ModelConfig support", () => {
    it("should create service with ModelConfig", async () => {
      // Arrange
      const modelConfig: ModelConfig = {
        provider: "openai",
        modelId: "gpt-4",
        config: {
          apiKey: "test-api-key",
        },
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-4" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      const serviceWithConfig = new VercelAITextGenerationService(modelConfig);
      const result = await serviceWithConfig.generateText("test");

      // Assert
      expect(result.text).toBe("Response");
      expect(generateText).toHaveBeenCalled();
    });

    it("should support custom baseURL in ModelConfig", async () => {
      // Arrange
      const modelConfig: ModelConfig = {
        provider: "openai",
        modelId: "gpt-3.5-turbo",
        config: {
          apiKey: "test-api-key",
          baseURL: "https://custom.example.com/v1",
        },
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-3.5-turbo" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      const serviceWithConfig = new VercelAITextGenerationService(modelConfig);
      await serviceWithConfig.generateText("test");

      // Assert
      expect(generateText).toHaveBeenCalled();
    });

    it("should support headers in ModelConfig", async () => {
      // Arrange
      const modelConfig: ModelConfig = {
        provider: "openai",
        modelId: "gpt-4",
        config: {
          apiKey: "test-api-key",
          headers: {
            "X-Custom-Header": "custom-value",
          },
        },
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-4" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      const serviceWithConfig = new VercelAITextGenerationService(modelConfig);
      await serviceWithConfig.generateText("test");

      // Assert
      expect(generateText).toHaveBeenCalled();
    });

    it("should throw error for unsupported provider", () => {
      // Arrange
      const modelConfig = {
        provider: "unsupported",
        modelId: "model-1",
        config: {
          apiKey: "test-key",
        },
      } as any;

      // Act & Assert
      expect(() => {
        new VercelAITextGenerationService(modelConfig);
      }).toThrow("Unsupported provider: unsupported");
    });
  });

  describe("TextGenerationConfig enhancements", () => {
    it("should pass headers from config", async () => {
      // Arrange
      const config: TextGenerationConfig = {
        headers: {
          "X-Request-ID": "12345",
        },
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-4" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      await service.generateText("test", config);

      // Assert
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { "X-Request-ID": "12345" },
        })
      );
    });

    it("should pass stopSequences from config", async () => {
      // Arrange
      const config: TextGenerationConfig = {
        stopSequences: ["\n\n", "END"],
      };

      const mockResponse = {
        text: "Response",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        finishReason: "stop",
        experimental_providerMetadata: { openai: { model: "gpt-4" } },
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      // Act
      await service.generateText("test", config);

      // Assert
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          stopSequences: ["\n\n", "END"],
        })
      );
    });
  });
});
