# Duskfare AI SDK

AI service abstractions and implementations for TypeScript applications.

## Features

- **Text Generation Service** - Unified interface for AI text generation with streaming support
- **Provider Agnostic** - Works with OpenAI, Google Gemini, OpenRouter, and more
- **Type-Safe** - Full TypeScript support with strict typing
- **Validated Responses** - Zod schema validation for all external API responses
- **Token Usage Tracking** - Detailed token usage statistics

## Installation

```bash
pnpm install duskfare-ai-sdk
```

## Quick Start

```typescript
import { openai } from "@ai-sdk/openai";
import { VercelAITextGenerationService } from "duskfare-ai-sdk";

const model = openai("gpt-4");
const service = new VercelAITextGenerationService(model);

const result = await service.generateText("What is TypeScript?");
console.log(result.text);
console.log(`Tokens used: ${result.usage.totalTokens}`);
```

## Development Setup

### Prerequisites

- **Node.js** 18+ or **Bun** 1.2+
- **pnpm** 10.9+ (package manager)

### Installation

```bash
pnpm install
pnpm build
```

### Environment Variables

For integration tests, create a `.env.test` file:

```bash
TEST_OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

Get your API key at [https://openrouter.ai/keys](https://openrouter.ai/keys)

### Testing

```bash
# Unit tests
pnpm test

# Integration tests (requires TEST_OPENROUTER_API_KEY)
pnpm test:integration

# Test with UI
pnpm test:ui
```

## Documentation

- **Text Generation Service** - [src/infra/service/text-generation/README.md](src/infra/service/text-generation/README.md)
- **Setup Guide** - [src/infra/service/text-generation/SETUP.md](src/infra/service/text-generation/SETUP.md)

## Contributing

This project follows strict TypeScript practices:

- ✅ No `any` types - always use proper typing
- ✅ Zod schemas for all external services
- ✅ TSDoc comments on all public APIs
- ✅ Dependency Inversion for testability

See [.cursor/rules/coding.mdc](.cursor/rules/coding.mdc) for coding standards.

## License

ISC
