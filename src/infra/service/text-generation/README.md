# Text Generation Service

Implementation of the `TextGenerationService` interface using the Vercel AI SDK.

## Features

- **Text Generation**: Synchronous text generation with complete results
- **Streaming**: Asynchronous streaming text generation with real-time chunks
- **Configuration**: Flexible configuration with defaults and per-request overrides
- **Token Usage Tracking**: Detailed token usage statistics
- **Model Abstraction**: Clean abstraction over Vercel AI SDK models

## Installation

```bash
pnpm add ai @ai-sdk/openai
```

## Usage

### Approach 1: Pre-configured Model (Recommended)

```typescript
import { openai } from "@ai-sdk/openai";
import { VercelAITextGenerationService } from "duskfare-ai-sdk";

const model = openai("gpt-4");
const service = new VercelAITextGenerationService(model);

const result = await service.generateText("What is TypeScript?");
console.log(result.text);
console.log(`Tokens used: ${result.usage.totalTokens}`);
```

### Approach 2: ModelConfig with API Key in Configuration

```typescript
import {
  VercelAITextGenerationService,
  type ModelConfig,
} from "duskfare-ai-sdk";

const modelConfig: ModelConfig = {
  provider: "openai",
  modelId: "gpt-4",
  config: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
};

const service = new VercelAITextGenerationService(modelConfig);
const result = await service.generateText("What is TypeScript?");
console.log(result.text);
```

### With Configuration

```typescript
const service = new VercelAITextGenerationService(model, {
  temperature: 0.7,
  maxTokens: 150,
});

const result = await service.generateText("Explain quantum computing", {
  temperature: 0.9, // Override for this request
});
```

### Streaming Text

```typescript
const result = await service.streamText("Tell me a story");

for await (const chunk of result.stream) {
  process.stdout.write(chunk);
}

const metadata = await result.metadata;
console.log(`\nTokens: ${metadata.usage.totalTokens}`);
```

### Custom Base URL and Headers

```typescript
const modelConfig: ModelConfig = {
  provider: "openai",
  modelId: "gpt-4",
  config: {
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: "https://custom-proxy.example.com/v1",
    headers: {
      "X-Custom-Header": "custom-value",
    },
  },
};

const service = new VercelAITextGenerationService(modelConfig);
```

### Advanced Configuration Options

```typescript
const result = await service.generateText("List programming languages:", {
  maxTokens: 50,
  stopSequences: ["\n\n", "4."], // Stop after 3 items
  headers: {
    "X-Request-ID": "custom-request-id",
  },
});
```

## API Reference

### `VercelAITextGenerationService`

#### Constructor

```typescript
constructor(
  modelOrConfig: LanguageModel | ModelConfig,
  defaultConfig?: TextGenerationConfig
)
```

- `modelOrConfig`: Either a pre-configured `LanguageModel` (from `openai()`) OR a `ModelConfig` object with API key
- `defaultConfig`: Optional default configuration applied to all requests

#### Methods

##### `generateText(prompt: string, config?: TextGenerationConfig): Promise<TextGenerationResult>`

Generates text synchronously.

**Returns:**

```typescript
{
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
  finishReason: "stop" | "length" | "content-filter" | "error" | "other";
  model: string;
}
```

##### `streamText(prompt: string, config?: TextGenerationConfig): Promise<TextStreamResult>`

Generates text as a stream.

**Returns:**

```typescript
{
  stream: AsyncIterableIterator<string>;
  metadata: Promise<{
    usage: { promptTokens; completionTokens; totalTokens };
    finishReason: "stop" | "length" | "content-filter" | "error" | "other";
    model: string;
  }>;
}
```

### Type Definitions

#### TextGenerationConfig

```typescript
interface TextGenerationConfig {
  model?: string;
  temperature?: number; // 0-2
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number; // -2.0 to 2.0
  presencePenalty?: number; // -2.0 to 2.0
  headers?: Record<string, string>; // Additional headers
  stopSequences?: string[]; // Stop sequences to terminate generation
}
```

#### ModelConfig

```typescript
interface ModelConfig {
  provider: "openai" | "anthropic" | "google";
  modelId: string; // e.g., "gpt-4", "gpt-3.5-turbo"
  config: ProviderConfig;
}

interface ProviderConfig {
  apiKey: string; // API key for authentication
  baseURL?: string; // Optional custom endpoint or proxy
  organization?: string; // Optional organization ID (OpenAI)
  project?: string; // Optional project ID (OpenAI)
  headers?: Record<string, string>; // Additional headers for API requests
}
```

## Testing

Tests use mocked Vercel AI SDK to avoid requiring API keys:

```bash
pnpm test text-generation-service.impl.test.ts
```

See `text-generation-service.impl.test.ts` for comprehensive test examples.

## Architecture

The service follows **Dependency Inversion Principle**:

- Service interface defines the contract (`TextGenerationService`)
- Infrastructure layer provides implementations (`VercelAITextGenerationService`)
- Tests mock the AI SDK, not the service itself

```
src/infra/service/text-generation/
├── types.ts                           # Domain types
├── text-generation-service.ts         # Service interface
├── text-generation-service.impl.ts    # Implementation
├── text-generation-service.impl.test.ts # Unit tests
├── examples.ts                        # Usage examples
├── README.md                          # Documentation
└── index.ts                           # Clean exports
```

## Environment Variables

For OpenAI:

```bash
export OPENAI_API_KEY="your-api-key"
```

Other providers supported by Vercel AI SDK can be used similarly.
