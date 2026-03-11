/* eslint-disable camelcase */
import * as z from 'zod';

export const MIN_TOP_N = 1;
export const MAX_TOP_N = 5;

export const EXPERIMENT_SETTINGS_FIELDS = ['top_n'] as const;

export const TASK_TYPE_BINARY = 'binary';
export const TASK_TYPE_MULTICLASS = 'multiclass';
export const TASK_TYPE_REGRESSION = 'regression';

const TASK_TYPES = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION] as const;

function getBaseSchema() {
  return z.object({
    train_data_secret_name: z.string().min(1).default(''),
    train_data_bucket_name: z.string().min(1).default(''),
    train_data_file_key: z.string().min(1).default(''),
    task_type: z.enum(TASK_TYPES).default(TASK_TYPE_BINARY),
    label_column: z.string().min(1).default(''),
    top_n: z
      .number()
      .min(MIN_TOP_N, `Minimum number of top models is ${MIN_TOP_N}`)
      .max(MAX_TOP_N, `Maximum number of top models is ${MAX_TOP_N}`)
      .default(3),
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
