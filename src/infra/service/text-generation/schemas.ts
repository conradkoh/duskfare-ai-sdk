import { z } from "zod";

/**
 * Zod schema for Vercel AI SDK usage response
 * According to actual API responses, promptTokens and completionTokens may be undefined
 */
export const AISDKUsageSchema = z.object({
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number(),
});

/**
 * Zod schema for Vercel AI SDK finish reason
 */
export const AISDKFinishReasonSchema = z.enum([
  "stop",
  "length",
  "content-filter",
  "error",
  "tool-calls",
  "unknown",
  "other",
]);

/**
 * Zod schema for Vercel AI SDK provider metadata
 */
export const AISDKProviderMetadataSchema = z
  .object({
    openai: z
      .object({
        model: z.string().optional(),
      })
      .optional(),
    anthropic: z
      .object({
        model: z.string().optional(),
      })
      .optional(),
    google: z
      .object({
        model: z.string().optional(),
      })
      .optional(),
  })
  .optional();

/**
 * Zod schema for Vercel AI SDK generateText response
 */
export const AISDKGenerateTextResponseSchema = z.object({
  text: z.string(),
  usage: AISDKUsageSchema,
  finishReason: AISDKFinishReasonSchema,
  experimental_providerMetadata: AISDKProviderMetadataSchema,
});

/**
 * TypeScript type inferred from Zod schema for infrastructure layer
 */
export type AISDKGenerateTextResponse = z.infer<
  typeof AISDKGenerateTextResponseSchema
>;

/**
 * TypeScript type inferred from Zod schema for infrastructure layer
 */
export type AISDKUsage = z.infer<typeof AISDKUsageSchema>;

/**
 * TypeScript type inferred from Zod schema for infrastructure layer
 */
export type AISDKFinishReason = z.infer<typeof AISDKFinishReasonSchema>;

/**
 * TypeScript type inferred from Zod schema for infrastructure layer
 */
export type AISDKProviderMetadata = z.infer<typeof AISDKProviderMetadataSchema>;
