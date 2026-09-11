import * as z from 'zod';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_RAG_PATTERNS,
  MAX_RAG_PATTERNS,
  PRESETS,
  PRESET_FASTER,
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
  RAG_METRIC_OVERALL_SCORE,
  DEFAULT_OPTIMIZATION_METRIC,
} from '~/app/utilities/const';
import { createSchema } from '~/app/utilities/schema';

export const RAG_OPTIMIZATION_METRICS = z.enum([
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
  RAG_METRIC_OVERALL_SCORE,
]);

export const EXPERIMENT_SETTINGS_FIELDS = ['embedding_models', 'generation_models'] as const;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return createSchema({
    // Make sure all fields (including optional ones) have a default to ensure RHF works as intended.
    /* eslint-disable camelcase */
    schema: z.object({
      display_name: z
        .string()
        .trim()
        .min(1)
        .refine(
          (val) => Array.from(val).length <= MAX_DISPLAY_NAME_LENGTH,
          `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`,
        )
        .default(''),
      description: z
        .string()
        .trim()
        .refine(
          (val) => Array.from(val).length <= MAX_DESCRIPTION_LENGTH,
          `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
        )
        .default('')
        .optional(),

      input_data_secret_name: z.string().min(1).default(''),
      input_data_bucket_name: z.string().min(1).default(''),
      input_data_key: z.string().min(1).default(''),

      test_data_secret_name: z.string().min(1).default(''),
      test_data_bucket_name: z.string().min(1).default(''),
      test_data_key: z.string().min(1).default(''),

      preset: z.enum(PRESETS).default(PRESET_FASTER),
      maas_secret_name: z.string().min(1).default(''),
      vector_db_secret_name: z.string().min(1).default(''),

      generation_models: z.array(z.string().trim().min(1)).min(1).default([]),
      embedding_models: z.array(z.string().trim().min(1)).min(1).default([]),

      optimization_metric: RAG_OPTIMIZATION_METRICS.default(DEFAULT_OPTIMIZATION_METRIC),
      // Note: the upper bound is enforced in `validators` below (applied only to `full`, the
      // schema used for new form submissions) rather than as a field-level `.max()`. A
      // field-level max would also apply to `base`, which is used to parse persisted
      // `runtime_config.parameters` from historical runs created under the previous, higher
      // limit — those must still parse successfully when loading/reconfiguring old runs.
      optimization_max_rag_patterns: z
        .number()
        .min(MIN_RAG_PATTERNS, `Minimum number of RAG patterns is ${MIN_RAG_PATTERNS}`)
        .default(5),

      // Output-only run metadata populated by the pipeline after language detection.
      detected_language: z.string().optional(),
      // Percentage confidence on a 0–100 scale.
      detected_language_confidence: z
        .number()
        .min(0, 'Language detection confidence must be at least 0')
        .max(100, 'Language detection confidence must be at most 100')
        .optional(),
    }),
    /* eslint-enable camelcase */
    validators: [
      (data) =>
        data.optimization_max_rag_patterns > MAX_RAG_PATTERNS
          ? [
              {
                code: 'custom' as const,
                message: `Maximum number of RAG patterns is ${MAX_RAG_PATTERNS}`,
                path: ['optimization_max_rag_patterns'],
                input: data.optimization_max_rag_patterns,
              },
            ]
          : [],
    ],
    /* eslint-disable no-param-reassign */
    transformers: [
      (data) => {
        if (data.description === '') {
          delete data.description;
        }
        delete data.detected_language;
        delete data.detected_language_confidence;
        return data;
      },
    ],
    /* eslint-enable no-param-reassign */
  });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>['base']>;

export { createConfigureSchema };
