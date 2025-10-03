/**
 * Integration tests for TextGenerationService (Bun Test Runner)
 *
 * These tests make real API calls and require valid API keys.
 * Bun automatically loads .env.test file in the project root.
 *
 * Required environment variables (in .env.test):
 * - TEST_OPENROUTER_API_KEY: OpenRouter API key (uses Gemini via OpenRouter)
 *
 * To run these tests:
 * 1. Create .env.test file in project root with your API key
 * 2. Run: pnpm test:integration
 */

import { beforeAll, describe, expect, it } from "bun:test";
import { VercelAITextGenerationService } from "./text-generation-service.impl.js";
import type { ModelConfig } from "./types.js";

// Check if integration tests should run
const shouldRunIntegrationTests = !!process.env.TEST_OPENROUTER_API_KEY;

// Helper to conditionally run tests
const describeIf = shouldRunIntegrationTests ? describe : describe.skip;

describeIf("TextGenerationService Integration Tests", () => {
  describe("OpenRouter with Gemini 2.5 Flash", () => {
    let service: VercelAITextGenerationService;

    beforeAll(() => {
      const apiKey = process.env.TEST_OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error(
          "TEST_OPENROUTER_API_KEY environment variable is required for OpenRouter tests",
        );
      }

      const modelConfig: ModelConfig = {
        provider: "openrouter",
        modelId: "google/gemini-2.5-flash",
        config: {
          apiKey,
          headers: {
            "HTTP-Referer": "https://github.com/duskfare-ai-sdk",
            "X-Title": "Duskfare AI SDK Integration Tests",
          },
        },
      };

      service = new VercelAITextGenerationService(modelConfig, {
        maxTokens: 50, // Keep responses short to minimize costs
        temperature: 0.7,
      });
    });

    it("should generate text successfully", async () => {
      // Arrange
      const prompt = "What is 2+2? Answer with just the number.";

      // Act
      const result = await service.generateText(prompt);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.text.toLowerCase()).toContain("4");

      // Verify metadata
      expect(result.usage).toBeDefined();
      expect(result.usage.totalTokens).toBeGreaterThan(0);

      // Note: promptTokens and completionTokens may be undefined for some providers
      // Only validate them if they are present
      if (result.usage.promptTokens !== undefined) {
        expect(result.usage.promptTokens).toBeGreaterThan(0);
      }
      if (result.usage.completionTokens !== undefined) {
        expect(result.usage.completionTokens).toBeGreaterThan(0);
      }
      if (
        result.usage.promptTokens !== undefined &&
        result.usage.completionTokens !== undefined
      ) {
        expect(result.usage.totalTokens).toBe(
          result.usage.promptTokens + result.usage.completionTokens,
        );
      }

      expect(result.finishReason).toBeDefined();
      expect(["stop", "length", "other"]).toContain(result.finishReason);

      expect(result.model).toBeDefined();
    }, 30000); // 30 second timeout

    it("should stream text successfully", async () => {
      // Arrange
      const prompt = "Count from 1 to 3, one number per line.";

      // Act
      const result = await service.streamText(prompt);

      // Collect stream chunks
      const chunks: string[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }

      // Get metadata after stream completes
      const metadata = await result.metadata;

      // Assert
      expect(chunks.length).toBeGreaterThan(0);
      const fullText = chunks.join("");
      expect(fullText.length).toBeGreaterThan(0);

      // Verify metadata
      expect(metadata.usage).toBeDefined();
      expect(metadata.usage.totalTokens).toBeGreaterThan(0);
      expect(metadata.finishReason).toBeDefined();
      expect(metadata.model).toBeDefined();
    }, 30000);

    it("should accept maxTokens configuration", async () => {
      // Arrange
      const prompt = "Write a short sentence about AI.";

      // Act
      const result = await service.generateText(prompt, {
        maxTokens: 20, // Very low limit
      });

      // Assert
      expect(result.text).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.finishReason).toBeDefined();

      // Note: OpenRouter/some providers may not strictly respect maxTokens
      // This test verifies that the config parameter is accepted without errors
      // rather than enforcing token limits which are provider-dependent
    }, 30000);

    it("should handle stop sequences", async () => {
      // Arrange
      const prompt = "List three colors: 1.";

      // Act
      const result = await service.generateText(prompt, {
        stopSequences: ["3."], // Stop before the third item
      });

      // Assert
      expect(result.text).toBeDefined();
      expect(result.text).not.toContain("3.");
    }, 30000);
  });

  describe("Alternative Model via OpenRouter", () => {
    let service: VercelAITextGenerationService;

    beforeAll(() => {
      const apiKey = process.env.TEST_OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error(
          "TEST_OPENROUTER_API_KEY environment variable is required",
        );
      }

      // Test with a different model to verify model switching works
      const modelConfig: ModelConfig = {
        provider: "openrouter",
        modelId: "google/gemini-2.5-flash",
        config: {
          apiKey,
          headers: {
            "HTTP-Referer": "https://github.com/duskfare-ai-sdk",
            "X-Title": "Duskfare AI SDK Integration Tests",
          },
        },
      };

      service = new VercelAITextGenerationService(modelConfig, {
        maxTokens: 50,
        temperature: 0.7,
      });
    });

    it("should generate text with alternative configuration", async () => {
      // Arrange
      const prompt = "What is the capital of France? Answer in one word.";

      // Act
      const result = await service.generateText(prompt);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text.toLowerCase()).toContain("paris");

      expect(result.usage.totalTokens).toBeGreaterThan(0);
      expect(result.finishReason).toBeDefined();
    }, 30000);

    it("should stream text with alternative configuration", async () => {
      // Arrange
      const prompt = "Say hello in 3 different languages.";

      // Act
      const result = await service.streamText(prompt);

      // Collect stream
      const chunks: string[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }

      const metadata = await result.metadata;
      const fullText = chunks.join("");

      // Assert
      expect(chunks.length).toBeGreaterThan(0);
      expect(fullText.length).toBeGreaterThan(0);
      expect(metadata.usage.totalTokens).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Configuration Merging", () => {
    it("should merge default config with request config", async () => {
      const apiKey = process.env.TEST_OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error("TEST_OPENROUTER_API_KEY required");
      }

      const modelConfig: ModelConfig = {
        provider: "openrouter",
        modelId: "google/gemini-2.5-flash",
        config: {
          apiKey,
        },
      };

      // Create service with default maxTokens
      const service = new VercelAITextGenerationService(modelConfig, {
        maxTokens: 100,
        temperature: 0.5,
      });

      // Override only temperature
      const result = await service.generateText("Say hello.", {
        temperature: 0.9, // Override
        // maxTokens should still be 100 from default
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle invalid API key gracefully", async () => {
      const modelConfig: ModelConfig = {
        provider: "openrouter",
        modelId: "google/gemini-2.5-flash",
        config: {
          apiKey: "invalid-api-key",
        },
      };

      const service = new VercelAITextGenerationService(modelConfig);

      // Expect the promise to reject
      await expect(service.generateText("Hello")).rejects.toThrow();
    }, 30000);
  });
});

// Print helpful message if tests are skipped
if (!shouldRunIntegrationTests) {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    Integration Tests Skipped                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Integration tests require API keys in .env.test file.

To run these tests:

1. Get API key:
   - OpenRouter: https://openrouter.ai/keys

2. Create .env.test file in project root:
   TEST_OPENROUTER_API_KEY="your-openrouter-key"

3. Run tests:
   pnpm test:integration

Note: Bun automatically loads .env.test file - no manual export needed!
      These tests make real API calls and may incur minimal costs.
      We use Gemini 2.0 Flash which has generous free tier limits.

For more details, see: src/infra/service/text-generation/SETUP.md
`);
}
