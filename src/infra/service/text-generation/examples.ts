/**
 * Example usage of VercelAITextGenerationService
 *
 * This file demonstrates how to use the text generation service.
 * It's not meant to be run directly in tests (requires API keys).
 */

import { openai } from "@ai-sdk/openai";
import { VercelAITextGenerationService } from "./text-generation-service.impl.js";
import type { ModelConfig } from "./types.js";

// Example 1: Basic text generation with pre-configured model
async function _basicExample() {
  const model = openai("gpt-4");
  const service = new VercelAITextGenerationService(model);

  const result = await service.generateText("What is the capital of France?");

  console.log("Response:", result.text);
  console.log("Tokens used:", result.usage.totalTokens);
  console.log("Finish reason:", result.finishReason);
  console.log("Model:", result.model);
}

// Example 2: Text generation with configuration
async function _configuredExample() {
  const model = openai("gpt-4");

  // Set default configuration
  const service = new VercelAITextGenerationService(model, {
    temperature: 0.7,
    maxTokens: 150,
  });

  // Override specific settings per request
  const result = await service.generateText(
    "Write a creative story about a robot.",
    {
      temperature: 0.9, // Higher temperature for more creativity
      maxTokens: 300,
    },
  );

  console.log("Story:", result.text);
}

// Example 3: Streaming text generation
async function _streamingExample() {
  const model = openai("gpt-4");
  const service = new VercelAITextGenerationService(model);

  const result = await service.streamText(
    "Explain quantum computing in simple terms.",
  );

  console.log("Streaming response:");

  // Consume the stream
  for await (const chunk of result.stream) {
    process.stdout.write(chunk);
  }

  // Get metadata after stream completes
  const metadata = await result.metadata;
  console.log("\n\nTokens used:", metadata.usage.totalTokens);
  console.log("Finish reason:", metadata.finishReason);
}

// Example 4: Using ModelConfig with API key in configuration
async function _modelConfigExample() {
  // Ensure OPENAI_API_KEY is set in environment
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  // Create service with ModelConfig - API key passed via config
  const modelConfig: ModelConfig = {
    provider: "openai",
    modelId: "gpt-4",
    config: {
      apiKey: process.env.OPENAI_API_KEY,
    },
  };

  const service = new VercelAITextGenerationService(modelConfig, {
    temperature: 0.7,
    maxTokens: 150,
  });

  const result = await service.generateText("What is dependency inversion?");
  console.log(result.text);
}

// Example 5: ModelConfig with custom base URL and headers
async function _customEndpointExample() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  const modelConfig: ModelConfig = {
    provider: "openai",
    modelId: "gpt-3.5-turbo",
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://custom-proxy.example.com/v1", // Custom endpoint
      headers: {
        "X-Custom-Header": "custom-value",
      },
    },
  };

  const service = new VercelAITextGenerationService(modelConfig);
  const result = await service.generateText("Hello from custom endpoint!");
  console.log(result.text);
}

// Example 6: Using headers and stop sequences in config
async function _advancedConfigExample() {
  const model = openai("gpt-4");
  const service = new VercelAITextGenerationService(model);

  const result = await service.generateText(
    "List three programming languages:",
    {
      maxTokens: 50,
      stopSequences: ["\n\n", "4."], // Stop after 3 items
      headers: {
        "X-Request-ID": "custom-request-id",
      },
    },
  );

  console.log(result.text);
}

// Example 7: Error handling
async function _errorHandlingExample() {
  const model = openai("gpt-4");
  const service = new VercelAITextGenerationService(model, {
    maxTokens: 10, // Very low token limit
  });

  try {
    const result = await service.generateText(
      "Write a very long essay about artificial intelligence.",
    );

    if (result.finishReason === "length") {
      console.log("Response was truncated due to max tokens limit");
    }
  } catch (error) {
    console.error("Error generating text:", error);
  }
}

// Uncomment to run examples (requires valid API key):
// basicExample().catch(console.error);
// configuredExample().catch(console.error);
// streamingExample().catch(console.error);
// modelConfigExample().catch(console.error);
// customEndpointExample().catch(console.error);
// advancedConfigExample().catch(console.error);
// errorHandlingExample().catch(console.error);
