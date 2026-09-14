/** Legacy pattern.json schema and its isolated conversion to the unified model. */
/* eslint-disable camelcase */
import * as z from 'zod';
import type {
  AutoragEvaluationMetric,
  AutoragPattern,
  AutoragVectorStoreBinding,
} from '~/app/types/autoragPattern';

const ScoreMetricSchema = z
  .object({
    mean: z.number().nullable(),
    ci_low: z.number().nullable(),
    ci_high: z.number().nullable(),
  })
  .passthrough();

const LegacySettingsSchema = z
  .object({
    vector_store: z
      .object({ datasource_type: z.string(), collection_name: z.string() })
      .passthrough()
      .optional(),
    vector_store_binding: z
      .object({
        provider_id: z.string(),
        provider_type: z.string(),
        vector_store_id: z.string().nullable(),
      })
      .passthrough()
      .optional(),
    chunking: z
      .object({ method: z.string(), chunk_size: z.number(), chunk_overlap: z.number() })
      .passthrough(),
    embedding: z
      .object({
        model_id: z.string().trim().min(1),
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
      .passthrough(),
    retrieval: z
      .object({
        method: z.string(),
        number_of_chunks: z.number(),
        search_mode: z.string().optional(),
        ranker_strategy: z.string().optional(),
      })
      .passthrough(),
    generation: z
      .object({
        model_id: z.string().trim().min(1),
        context_template_text: z.string().optional(),
        user_message_text: z.string().optional(),
        system_message_text: z.string().optional(),
        detected_language: z
          .object({ code: z.string(), name: z.string() })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    responses_template: z.any().optional(),
  })
  .passthrough();

export const LegacyPatternSchema = z
  .object({
    name: z.string(),
    iteration: z.number(),
    max_combinations: z.number(),
    duration_seconds: z.number(),
    settings: LegacySettingsSchema,
    scores: z.record(z.string(), ScoreMetricSchema),
    final_score: z.number(),
  })
  .passthrough();

export type LegacyRawPattern = z.infer<typeof LegacyPatternSchema>;

export function normalizeLegacyPattern(
  raw: LegacyRawPattern,
  vectorIoProviderId?: string,
): AutoragPattern {
  const synthesizedOverallScore: AutoragEvaluationMetric = {
    evaluator: 'custom',
    name: 'overall_score',
    scores: { mean: raw.final_score, ci_low: null, ci_high: null },
    optimization_metric: true,
  };

  const metrics: AutoragEvaluationMetric[] = Object.entries(raw.scores).map(([name, metric]) =>
    name === 'overall_score'
      ? synthesizedOverallScore
      : { evaluator: 'unitxt', name, scores: metric },
  );
  if (!metrics.some((metric) => metric.name === 'overall_score')) {
    metrics.push(synthesizedOverallScore);
  }

  const legacyVectorStoreBinding =
    raw.settings.vector_store_binding ??
    (raw.settings.vector_store
      ? {
          provider_id: vectorIoProviderId ?? '',
          provider_type: raw.settings.vector_store.datasource_type,
          vector_store_id: raw.settings.vector_store.collection_name,
        }
      : undefined);
  const { detected_language: detectedLanguage, ...generationRest } = raw.settings.generation;

  const vectorStoreBinding: AutoragVectorStoreBinding | undefined = legacyVectorStoreBinding
    ? {
        provider_type: legacyVectorStoreBinding.provider_type,
        collection_name: legacyVectorStoreBinding.vector_store_id ?? '',
      }
    : undefined;

  return {
    name: raw.name,
    iteration: raw.iteration,
    max_combinations: raw.max_combinations,
    duration_seconds: raw.duration_seconds,
    settings: {
      vector_store_binding: vectorStoreBinding,
      chunking: raw.settings.chunking,
      embedding: raw.settings.embedding,
      retrieval: raw.settings.retrieval,
      generation: { ...generationRest, language: detectedLanguage },
    },
    evaluation: { metrics },
    inference: raw.settings.responses_template
      ? { responses_template: raw.settings.responses_template }
      : undefined,
  };
}

/* eslint-enable camelcase */
