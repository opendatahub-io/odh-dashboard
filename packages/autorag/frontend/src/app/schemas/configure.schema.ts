import { omit } from 'es-toolkit';
import * as z from 'zod';
import { createSchema } from '~/app/utilities/schema';

export const MIN_RAG_PATTERNS = 4;
export const MAX_RAG_PATTERNS = 20;

// The BFF returns all providers; this allowlist is applied client-side via the
// select callback to limit which providers appear in the UI.
export const SUPPORTED_VECTOR_STORE_PROVIDERS = ['milvus'];

export const RAG_METRIC_FAITHFULNESS = 'faithfulness';
export const RAG_METRIC_ANSWER_CORRECTNESS = 'answer_correctness';
export const RAG_METRIC_CONTEXT_CORRECTNESS = 'context_correctness';
export const RAG_OPTIMIZATION_METRICS = z.enum([
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
]);

export const EXPERIMENT_SETTINGS_FIELDS = [
  'optimization_metric',
  'optimization_max_rag_patterns',
  'embeddings_models',
  'generation_models',
] as const;

const INPUT_DATA_SOURCE_MODE = z.enum(['select', 'upload']);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return createSchema({
    // Make sure all fields (including optional ones) have a default to ensure RHF works as intended.
    /* eslint-disable camelcase */
    schema: z.object({
      display_name: z.string().min(1).default(''),
      description: z.string().default('').optional(),

      input_data_secret_name: z.string().min(1).default(''),
      input_data_bucket_name: z.string().min(1).default(''),
      /** Object key in bucket; may be empty in upload mode until Run experiment uploads (see input_data_pending_filename). */
      input_data_key: z.string().default(''),

      /** UI-only: how the user chose input data; stripped before pipeline API. */
      input_data_source_mode: INPUT_DATA_SOURCE_MODE.default('select'),
      /** UI-only: set when a file is staged for deferred upload; stripped before pipeline API. */
      input_data_pending_filename: z.string().default(''),

      test_data_secret_name: z.string().min(1).default(''),
      test_data_bucket_name: z.string().min(1).default(''),
      test_data_key: z.string().min(1).default(''),

      llama_stack_secret_name: z.string().min(1).default(''),
      llama_stack_vector_database_id: z.string().default('').optional(),

      generation_models: z.array(z.string()).min(1).default([]),
      embeddings_models: z.array(z.string()).min(1).default([]),

      optimization_metric: RAG_OPTIMIZATION_METRICS.default(RAG_METRIC_FAITHFULNESS),
      optimization_max_rag_patterns: z
        .number()
        .min(MIN_RAG_PATTERNS, `Minimum number of RAG patterns is ${MIN_RAG_PATTERNS}`)
        .max(MAX_RAG_PATTERNS, `Maximum number of RAG patterns is ${MAX_RAG_PATTERNS}`)
        .default(8),
    }),
    /* eslint-enable camelcase */
    validators: [
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        if (data.input_data_source_mode === 'select') {
          if (!data.input_data_key.trim()) {
            issues.push({
              code: 'custom',
              input: data,
              path: ['input_data_key'],
              message: 'Select a file or folder from the bucket.',
            });
          }
        }
        if (data.input_data_source_mode === 'upload') {
          if (!data.input_data_key.trim() && !data.input_data_pending_filename.trim()) {
            issues.push({
              code: 'custom',
              input: data,
              path: ['input_data_key'],
              message: 'Choose a file to upload or switch to select mode.',
            });
          }
        }
        return issues;
      },
    ],
    /* eslint-disable no-param-reassign */
    transformers: [
      (data) => {
        if (data.description === '') {
          delete data.description;
        }
        if (data.llama_stack_vector_database_id === '') {
          delete data.llama_stack_vector_database_id;
        }
        return data;
      },
    ],
    /* eslint-enable no-param-reassign */
  });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>['base']>;

/** Fields only used for validation and UI; omit before POST `/pipeline-runs`. */
export type ConfigurePipelinePayload = Omit<
  ConfigureSchema,
  'input_data_source_mode' | 'input_data_pending_filename'
>;

export function stripConfigureUiFieldsForPipeline(data: ConfigureSchema): ConfigurePipelinePayload {
  return omit(data, ['input_data_source_mode', 'input_data_pending_filename']);
}

export { createConfigureSchema, INPUT_DATA_SOURCE_MODE };
