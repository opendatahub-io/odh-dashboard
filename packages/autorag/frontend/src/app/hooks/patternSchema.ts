/**
 * Zod schemas to validate AutoragPattern shape from pattern.json files.
 *
 * Two schemas cover the evolution of the pattern.json format:
 *   - V1 (legacy):  top-level `scores` record + `final_score`, `responses_template` in settings
 *   - V2 (current): `evaluation` block with metrics array, `inference` + `indexing` blocks
 *
 * Common fields are defined in base schemas and extended per version.
 *
 * All object schemas use .passthrough() so new backend fields are preserved
 * through validation rather than silently stripped or rejected.
 */
/* eslint-disable camelcase */
import * as z from 'zod';

const AutoragPatternScoreMetricSchema = z
  .object({
    mean: z.number(),
    ci_low: z.number().nullable(),
    ci_high: z.number().nullable(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Base schemas — fields shared across all pattern.json versions
// ---------------------------------------------------------------------------

const AutoragPatternBaseSchema = z
  .object({
    name: z.string(),
    iteration: z.number(),
    max_combinations: z.number(),
    duration_seconds: z.number(),
  })
  .passthrough();

const ChunkingSchema = z
  .object({
    method: z.string(),
    chunk_size: z.number(),
    chunk_overlap: z.number(),
  })
  .passthrough();

const RetrievalSchema = z
  .object({
    method: z.string(),
    number_of_chunks: z.number(),
    search_mode: z.string().optional(),
    ranker_strategy: z.string().optional(),
  })
  .passthrough();

const EmbeddingBaseParamsSchema = z
  .object({
    embedding_dimension: z.number(),
    context_length: z.number().optional(),
  })
  .passthrough();

const VectorStoreSchema = z
  .object({
    datasource_type: z.string(),
    collection_name: z.string(),
  })
  .passthrough();

const VectorStoreBindingSchema = z
  .object({
    provider_id: z.string(),
    provider_type: z.string(),
    vector_store_id: z.string(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// V1 (legacy) — top-level scores/final_score, responses_template in settings
// ---------------------------------------------------------------------------

const AutoragPatternSettingsV1Schema = z
  .object({
    vector_store: VectorStoreSchema.optional(),
    vector_store_binding: VectorStoreBindingSchema.optional(),
    chunking: ChunkingSchema,
    embedding: z
      .object({
        model_id: z.string(),
        distance_metric: z.string().optional(),
        embedding_params: EmbeddingBaseParamsSchema.extend({
          timeout: z.number().nullable().optional(),
          model_type: z.string().nullable().optional(),
          provider_id: z.string().nullable().optional(),
          provider_resource_id: z.string().nullable().optional(),
        }).passthrough(),
      })
      .passthrough(),
    retrieval: RetrievalSchema,
    generation: z
      .object({
        model_id: z.string(),
        context_template_text: z.string().optional(),
        user_message_text: z.string().optional(),
        system_message_text: z.string().optional(),
        detected_language: z
          .object({
            code: z.string(),
            name: z.string(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    responses_template: z.any().optional(),
  })
  .passthrough();

const AutoragPatternSchemaV1 = AutoragPatternBaseSchema.extend({
  settings: AutoragPatternSettingsV1Schema,
  scores: z.record(z.string(), AutoragPatternScoreMetricSchema),
  final_score: z.number(),
});

// ---------------------------------------------------------------------------
// V2 (current) — evaluation block, inference/indexing top-level sections
// ---------------------------------------------------------------------------

const AutoragEvaluationMetricSchema = z
  .object({
    evaluator: z.string(),
    name: z.string(),
    description: z.string().optional(),
    scores: AutoragPatternScoreMetricSchema,
    model_id: z.string().optional(),
    optimization_metric: z.boolean().optional(),
  })
  .passthrough();

const AutoragPatternSettingsV2Schema = z
  .object({
    vector_store_binding: VectorStoreBindingSchema.optional(),
    chunking: ChunkingSchema,
    embedding: z
      .object({
        model_id: z.string(),
        distance_metric: z.string().optional(),
        embedding_params: EmbeddingBaseParamsSchema.extend({
          timeout: z.number().nullable().optional(),
          model_type: z.string().nullable().optional(),
          provider_id: z.string().nullable().optional(),
          provider_resource_id: z.string().nullable().optional(),
        }).passthrough(),
      })
      .passthrough(),
    retrieval: RetrievalSchema.extend({
      ranker_alpha: z.number().optional(),
    }),
    generation: z
      .object({
        model_id: z.string(),
        temperature: z.number().optional(),
        max_completion_tokens: z.number().optional(),
        context_template_text: z.string().optional(),
        user_message_text: z.string().optional(),
        system_message_text: z.string().optional(),
        language: z
          .object({
            code: z.string(),
            name: z.string(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const AutoragPatternSchemaV2 = AutoragPatternBaseSchema.extend({
  settings: AutoragPatternSettingsV2Schema,
  evaluation: z
    .object({
      metrics: z.array(AutoragEvaluationMetricSchema),
    })
    .passthrough(),
  inference: z
    .object({
      responses_template: z.any().optional(),
    })
    .passthrough()
    .optional(),
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
});

// ---------------------------------------------------------------------------
// Union + type guards
// ---------------------------------------------------------------------------

// Try V2 first, then fall back to V1 for backwards compatibility.
export const AutoragPatternSchema = z.union([AutoragPatternSchemaV2, AutoragPatternSchemaV1]);

export type AutoragRawPatternV1 = z.infer<typeof AutoragPatternSchemaV1>;
export type AutoragRawPatternV2 = z.infer<typeof AutoragPatternSchemaV2>;
export type AutoragRawPattern = z.infer<typeof AutoragPatternSchema>;

export const isV1RawPattern = (raw: AutoragRawPattern): raw is AutoragRawPatternV1 =>
  'scores' in raw && !('evaluation' in raw);

/* eslint-enable camelcase */
