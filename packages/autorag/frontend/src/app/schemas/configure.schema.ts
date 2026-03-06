/* eslint-disable camelcase */
import * as z from 'zod';

export const MIN_RAG_PATTERNS = 4;
export const MAX_RAG_PATTERNS = 20;

export const LLS_DEFAULT_MILVUS = 'ls_milvus';

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

function getBaseSchema() {
  return z.object({
    name: z.string().min(1).default(''),

    input_data_secret_name: z.string().min(1).optional(),
    input_data_bucket_name: z.string().min(1).optional(),
    input_data_key: z.string().min(1).optional(),

    test_data_secret_name: z.string().min(1).optional(),
    test_data_bucket_name: z.string().min(1).optional(),
    test_data_key: z.string().min(1).optional(),

    llama_stack_secret_name: z.string().min(1).optional(),
    llama_stack_vector_database_id: z.string().default(LLS_DEFAULT_MILVUS),

    generation_models: z.array(z.string()).min(1).default([]),
    embeddings_models: z.array(z.string()).min(1).default([]),

    optimization_metric: RAG_OPTIMIZATION_METRICS.default(RAG_METRIC_FAITHFULNESS),
    optimization_max_rag_patterns: z
      .number()
      .min(MIN_RAG_PATTERNS, `Minimum number of RAG patterns is ${MIN_RAG_PATTERNS}`)
      .max(MAX_RAG_PATTERNS, `Maximum number of RAG patterns is ${MAX_RAG_PATTERNS}`)
      .default(8),
  });
}

// Make sure every field has a default to ensure RHF works as intended.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return getBaseSchema()
    .superRefine((data, { addIssue }) => {
      for (const validate of VALIDATORS) {
        for (const issue of validate(data)) {
          addIssue(issue);
        }
      }
    })
    .transform((data) => {
      for (const transform of TRANSFORMERS) {
        transform(data);
      }
      return data;
    });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>>;

type Validator = (data: ConfigureSchema) => z.core.$ZodRawIssue[];
type Transformer = (data: ConfigureSchema) => void;

const VALIDATORS: Array<Validator> = [];

const TRANSFORMERS: Array<Transformer> = [];

export default createConfigureSchema;
