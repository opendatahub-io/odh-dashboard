/** Zod schema for the ODH-ADR-0004 pattern.json contract. */
/* eslint-disable camelcase */
import * as z from 'zod';

const scoreSchema = z
  .object({
    mean: z.number().nullable(),
    ci_low: z.number().nullable(),
    ci_high: z.number().nullable(),
  })
  .passthrough();

const baseSchema = z
  .object({
    name: z.string(),
    iteration: z.number(),
    max_combinations: z.number(),
    duration_seconds: z.number(),
  })
  .passthrough();

const chunkingSchema = z
  .object({ method: z.string(), chunk_size: z.number(), chunk_overlap: z.number() })
  .passthrough();
const retrievalSchema = z
  .object({
    method: z.string(),
    number_of_chunks: z.number(),
    search_mode: z.string().optional(),
    ranker_strategy: z.string().optional(),
    ranker_alpha: z.number().optional(),
  })
  .passthrough();
const embeddingSchema = z
  .object({
    model_id: z.string(),
    distance_metric: z.string().optional(),
    embedding_params: z
      .object({
        embedding_dimension: z.number(),
        context_length: z.number().optional(),
        timeout: z.number().nullable().optional(),
        model_type: z.string().nullable().optional(),
        provider_id: z.string().nullable().optional(),
        provider_resource_id: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();
const vectorStoreBindingSchema = z
  .object({
    provider_id: z.string(),
    provider_type: z.string(),
    vector_store_id: z.string().nullable(),
  })
  .passthrough();

const metricSchema = z
  .object({
    evaluator: z.string(),
    name: z.string(),
    description: z.string(),
    scores: scoreSchema,
    model_id: z.string().optional(),
    optimization_metric: z.boolean().optional(),
  })
  .passthrough();

export const AutoragPatternSchema = baseSchema
  .extend({
    settings: z
      .object({
        vector_store_binding: vectorStoreBindingSchema.optional(),
        chunking: chunkingSchema,
        embedding: embeddingSchema,
        retrieval: retrievalSchema,
        generation: z
          .object({
            model_id: z.string(),
            temperature: z.number().optional(),
            max_completion_tokens: z.number().optional(),
            context_template_text: z.string().optional(),
            user_message_text: z.string().optional(),
            system_message_text: z.string().optional(),
            language: z.object({ code: z.string(), name: z.string() }).passthrough().optional(),
          })
          .passthrough(),
      })
      .passthrough(),
    evaluation: z.object({ metrics: z.array(metricSchema) }).passthrough(),
    inference: z.object({ responses_template: z.any().optional() }).passthrough().optional(),
    indexing: z
      .object({
        pipeline_spec: z
          .object({
            pipeline_name: z.string(),
            parameters: z.record(z.string(), z.unknown()),
            overrides_allowed: z.array(z.string()),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .superRefine((pattern, ctx) => {
    if (pattern.evaluation.metrics.filter((metric) => metric.optimization_metric).length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evaluation', 'metrics'],
        message: 'Exactly one metric must have optimization_metric set to true',
      });
    }
  });

export type AutoragRawPattern = z.infer<typeof AutoragPatternSchema>;
/* eslint-enable camelcase */
