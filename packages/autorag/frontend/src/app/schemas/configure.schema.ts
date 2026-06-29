import * as z from 'zod';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_RAG_PATTERNS,
  MAX_RAG_PATTERNS,
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
} from '~/app/utilities/const';
import { createSchema } from '~/app/utilities/schema';
// TODO: Re-enable in 3.5 when DEFAULT_IN_MEMORY_PROVIDER is available.
// import type { OgxVectorStoreProvider } from '~/app/types';

// The allowlist of supported vector store provider types.
// The BFF returns all vector_io providers; only providers with these types are shown in the UI.
// The selected value is the provider_id.
export const SUPPORTED_VECTOR_STORE_PROVIDER_TYPES = ['remote::milvus', 'remote::pgvector'];

// Default in-memory vector store provider — disabled until 3.5 or later.
// When re-enabled, this should be injected at the beginning of the provider list
// and the schema field should become optional with this as the default.
// export const DEFAULT_IN_MEMORY_PROVIDER: OgxVectorStoreProvider = {
//   provider_id: 'MILVUS_IN_MEMORY_DEFAULT',
//   provider_type: 'IN_MEMORY',
// };

export const RAG_OPTIMIZATION_METRICS = z.enum([
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
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

      ogx_secret_name: z.string().min(1).default(''),
      vector_io_provider_id: z.string().min(1).default(''),

      generation_models: z.array(z.string()).min(1).default([]),
      embedding_models: z.array(z.string()).min(1).default([]),

      optimization_metric: RAG_OPTIMIZATION_METRICS.default(RAG_METRIC_FAITHFULNESS),
      optimization_max_rag_patterns: z
        .number()
        .min(MIN_RAG_PATTERNS, `Minimum number of RAG patterns is ${MIN_RAG_PATTERNS}`)
        .max(MAX_RAG_PATTERNS, `Maximum number of RAG patterns is ${MAX_RAG_PATTERNS}`)
        .default(8),
    }),
    /* eslint-enable camelcase */
    /* eslint-disable no-param-reassign */
    transformers: [
      (data) => {
        if (data.description === '') {
          delete data.description;
        }
        // TODO: Re-enable in 3.5 when DEFAULT_IN_MEMORY_PROVIDER is available.
        // Delete vector database ID if it's empty or set to the default in-memory provider.
        // if (
        //   data.vector_io_provider_id === '' ||
        //   data.vector_io_provider_id === DEFAULT_IN_MEMORY_PROVIDER.provider_id
        // ) {
        //   delete data.vector_io_provider_id;
        // }
        return data;
      },
    ],
    /* eslint-enable no-param-reassign */
  });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>['base']>;

export { createConfigureSchema };
