/** Canonical schemas for persisted AutoRAG pattern.json artifacts. */
/* eslint-disable camelcase */
import * as z from 'zod';
import { LegacyPatternSchema, type LegacyRawPattern } from './legacyPattern';

const FiniteNumberSchema = z.number().finite();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ScoreMetricSchema = z
  .object({
    mean: FiniteNumberSchema.nullable(),
    ci_low: FiniteNumberSchema.nullable(),
    ci_high: FiniteNumberSchema.nullable(),
  })
  .passthrough();

const PatternBaseSchema = z
  .object({
    name: z.string(),
    iteration: FiniteNumberSchema,
    max_combinations: FiniteNumberSchema,
    duration_seconds: FiniteNumberSchema,
  })
  .passthrough();

const ChunkingSchema = z
  .object({
    method: z.string(),
    chunk_size: FiniteNumberSchema,
    chunk_overlap: FiniteNumberSchema,
  })
  .passthrough();

const RetrievalSchema = z
  .object({
    method: z.string(),
    number_of_chunks: FiniteNumberSchema,
    search_mode: z.string().optional(),
    ranker_strategy: z.string().optional(),
    ranker_alpha: FiniteNumberSchema.optional(),
  })
  .passthrough();

const EmbeddingSchema = z
  .object({
    model_id: z.string().trim().min(1),
    distance_metric: z.string().optional(),
    embedding_params: z
      .object({
        embedding_dimension: FiniteNumberSchema,
        context_length: FiniteNumberSchema.optional(),
        timeout: FiniteNumberSchema.nullable().optional(),
        model_type: z.string().nullable().optional(),
        provider_id: z.string().nullable().optional(),
        provider_resource_id: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const VectorStoreBindingSchema = z.preprocess(
  (value) => {
    if (!isRecord(value) || Array.isArray(value)) {
      return value;
    }

    if (!('collection_name' in value) && typeof value.vector_store_id === 'string') {
      return { ...value, collection_name: value.vector_store_id };
    }

    return value;
  },
  z
    .object({
      provider_type: z.string(),
      collection_name: z.string(),
    })
    .passthrough(),
);

const PatternSettingsSchema = z
  .object({
    vector_store_binding: VectorStoreBindingSchema.optional(),
    chunking: ChunkingSchema,
    embedding: EmbeddingSchema,
    retrieval: RetrievalSchema,
    generation: z
      .object({
        model_id: z.string().trim().min(1),
        temperature: FiniteNumberSchema.optional(),
        max_completion_tokens: FiniteNumberSchema.optional(),
        context_template_text: z.string().optional(),
        user_message_text: z.string().optional(),
        system_message_text: z.string().optional(),
        language: z.object({ code: z.string(), name: z.string() }).passthrough().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const EvaluationMetricSchema = z
  .object({
    evaluator: z.string(),
    name: z.string(),
    description: z.string().optional(),
    scores: ScoreMetricSchema,
    model_id: z.string().optional(),
    optimization_metric: z.boolean().optional(),
  })
  .passthrough();

export const CanonicalPatternSchema = PatternBaseSchema.extend({
  settings: PatternSettingsSchema,
  evaluation: z.object({ metrics: z.array(EvaluationMetricSchema) }).passthrough(),
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
});

export type CanonicalRawPattern = z.infer<typeof CanonicalPatternSchema>;
export type RawPatternArtifact = CanonicalRawPattern | LegacyRawPattern;

/** Dispatches by persisted shape, with canonical evaluation as the primary path. */
export const parsePatternArtifact = (value: unknown): RawPatternArtifact => {
  if (isRecord(value) && 'evaluation' in value) {
    return CanonicalPatternSchema.parse(value);
  }
  if (isRecord(value) && ('scores' in value || 'final_score' in value)) {
    return LegacyPatternSchema.parse(value);
  }
  return CanonicalPatternSchema.parse(value);
};

export const isCanonicalRawPattern = (raw: RawPatternArtifact): raw is CanonicalRawPattern =>
  'evaluation' in raw;

/* eslint-enable camelcase */
