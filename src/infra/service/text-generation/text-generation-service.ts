import type {
  TextGenerationConfig,
  TextGenerationResult,
  TextStreamResult,
} from "./types.js";

/**
 * Service interface for text generation operations
 */
export interface TextGenerationService {
  /**
   * Generates text synchronously and returns the complete result
   * @param prompt - The input prompt for text generation
   * @param config - Optional configuration to override defaults
   * @returns Promise resolving to the complete generation result
   */
  generateText(
    prompt: string,
    config?: TextGenerationConfig,
  ): Promise<TextGenerationResult>;

  /**
   * Generates text as a stream of chunks
   * @param prompt - The input prompt for text generation
   * @param config - Optional configuration to override defaults
   * @returns Promise resolving to a stream result with async iterator and metadata
   */
  streamText(
    prompt: string,
    config?: TextGenerationConfig,
  ): Promise<TextStreamResult>;
}
