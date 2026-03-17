/* eslint-disable camelcase */
import * as z from 'zod';

export const MIN_TOP_N = 1;
export const MAX_TOP_N = 5;

export const EXPERIMENT_SETTINGS_FIELDS = ['top_n'] as const;

export const TASK_TYPE_BINARY = 'binary';
export const TASK_TYPE_MULTICLASS = 'multiclass';
export const TASK_TYPE_REGRESSION = 'regression';
export const TASK_TYPE_TIMESERIES = 'timeseries';

const TABULAR_TASK_TYPES = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION] as const;
export const TASK_TYPES = [...TABULAR_TASK_TYPES, TASK_TYPE_TIMESERIES] as const;

function getBaseSchema() {
  return z.object({
    // Common fields
    task_type: z.enum(TASK_TYPES).default(TASK_TYPE_BINARY),
    train_data_secret_name: z.string().min(1).default(''),
    train_data_bucket_name: z.string().min(1).default(''),
    train_data_file_key: z.string().min(1).default(''),
    top_n: z
      .number()
      .min(MIN_TOP_N, `Minimum number of top models is ${MIN_TOP_N}`)
      .max(MAX_TOP_N, `Maximum number of top models is ${MAX_TOP_N}`)
      .default(3),

    // Tabular-specific fields (optional at base level, validated conditionally)
    label_column: z.string().default('').optional(),

    // Timeseries-specific fields (optional at base level, validated conditionally)
    target: z.string().default('').optional(),
    id_column: z.string().default('').optional(),
    timestamp_column: z.string().default('').optional(),
    prediction_length: z.number().min(1).default(1).optional(),
    known_covariates_names: z.array(z.string()).default([]).optional(),
  });
}

// Make sure every field has a default to ensure RHF works as intended.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return getBaseSchema()
    .superRefine((data, ctx) => {
      // Apply other validators
      for (const validate of VALIDATORS) {
        for (const issue of validate(data)) {
          ctx.addIssue(issue);
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

const TRANSFORMERS: Array<Transformer> = [
  // Remove task-type-specific fields based on the selected task_type
  (data) => {
    /* eslint-disable no-param-reassign */
    if (data.task_type === TASK_TYPE_TIMESERIES) {
      // Remove tabular-specific fields
      delete data.label_column;
    } else {
      // Remove timeseries-specific fields for tabular task types
      delete data.target;
      delete data.id_column;
      delete data.timestamp_column;
      delete data.prediction_length;
      delete data.known_covariates_names;
    }
    /* eslint-enable no-param-reassign */
  },
];

/**
 * Get default values for the configure form.
 * Automatically applies all schema defaults.
 */
export function getDefaultValues(): ConfigureSchema {
  const schema = createConfigureSchema();
  return schema.parse({});
}

export default createConfigureSchema;
