/**
 * Represents the result of a text generation operation
 */
export interface TextGenerationResult {
  /** The generated text content */
  text: string;
  /** Token usage statistics */
  usage: {
    /** Number of tokens in the prompt (may be undefined for some providers) */
    promptTokens?: number;
    /** Number of tokens in the completion (may be undefined for some providers) */
    completionTokens?: number;
    /** Total tokens used (prompt + completion) */
    totalTokens: number;
  };
  /** Reason why the generation finished */
  finishReason: "stop" | "length" | "content-filter" | "error" | "other";
  /** Model identifier used for generation */
  model: string;
}

/**
 * Represents a streaming text generation result
 */
export interface TextStreamResult {
  /** Async iterator yielding text chunks */
  stream: AsyncIterableIterator<string>;
  /** Promise that resolves with metadata when stream completes */
  metadata: Promise<{
    usage: {
      /** Number of tokens in the prompt (may be undefined for some providers) */
      promptTokens?: number;
      /** Number of tokens in the completion (may be undefined for some providers) */
      completionTokens?: number;
      totalTokens: number;
    };
    finishReason: "stop" | "length" | "content-filter" | "error" | "other";
    model: string;
  }>;
}

/**
 * Configuration options for text generation
 */
export interface TextGenerationConfig {
  /** Model identifier (e.g., 'gpt-4', 'gpt-3.5-turbo') */
  model?: string;
  /** Temperature for randomness (0-2, default varies by provider) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Frequency penalty (-2.0 to 2.0) */
  frequencyPenalty?: number;
  /** Presence penalty (-2.0 to 2.0) */
  presencePenalty?: number;
  /** Additional headers to send with requests */
  headers?: Record<string, string>;
  /** Stop sequences to terminate generation */
  stopSequences?: string[];
}

/**
 * Provider-specific configuration for creating models dynamically
 */
export interface ProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Optional base URL for custom endpoints or proxies */
  baseURL?: string;
  /** Optional organization ID (for providers that support it) */
  organization?: string;
  /** Optional project ID (for providers that support it) */
  project?: string;
  /** Deployment ID for providers that require it (e.g., Google Gemini on Vertex AI) */
  deploymentId?: string;
  /** Additional headers for API requests */
  headers?: Record<string, string>;
}

/**
 * Configuration for creating a model from provider settings
 */
export interface ModelConfig {
  /** The provider to use ('openai', 'anthropic', etc.) */
  provider: "openai" | "anthropic" | "google" | "openrouter";
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus-20240229') */
  modelId: string;
  /** Provider-specific configuration */
  config: ProviderConfig;
}
