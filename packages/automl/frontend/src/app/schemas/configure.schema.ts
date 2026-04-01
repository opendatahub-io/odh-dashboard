/* eslint-disable camelcase */
import * as z from 'zod';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';
import { createSchema } from '~/app/utilities/schema';

export const MIN_TOP_N = 1;
export const MAX_TOP_N = 5;

export const EXPERIMENT_SETTINGS_FIELDS = ['top_n'] as const;

const TABULAR_TASK_TYPES = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION] as const;
export const TASK_TYPES = [...TABULAR_TASK_TYPES, TASK_TYPE_TIMESERIES] as const;

// Make sure every field has a default to ensure RHF works as intended.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return createSchema({
    schema: z.object({
      // Common fields
      display_name: z.string().trim().min(1).default(''),
      description: z.string().trim().default('').optional(),
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
    }),
    validators: [
      // Validate tabular-specific required fields
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        if (data.task_type !== TASK_TYPE_TIMESERIES) {
          if (!data.label_column || data.label_column.trim() === '') {
            issues.push({
              code: 'custom',
              path: ['label_column'],
              message: 'Label column is required',
              input: data.label_column,
            });
          }
        }
        return issues;
      },
      // Validate timeseries-specific required fields
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        if (data.task_type === TASK_TYPE_TIMESERIES) {
          if (!data.target || data.target.trim() === '') {
            issues.push({
              code: 'custom',
              path: ['target'],
              message: 'Target column is required',
              input: data.target,
            });
          }
          if (!data.id_column || data.id_column.trim() === '') {
            issues.push({
              code: 'custom',
              path: ['id_column'],
              message: 'ID column is required',
              input: data.id_column,
            });
          }
          if (!data.timestamp_column || data.timestamp_column.trim() === '') {
            issues.push({
              code: 'custom',
              path: ['timestamp_column'],
              message: 'Timestamp column is required',
              input: data.timestamp_column,
            });
          }
        }
        return issues;
      },
    ],
    /* eslint-disable no-param-reassign */
    transformers: [
      // Remove task-type-specific fields based on the selected task_type
      (data) => {
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
        return data;
      },
    ],
    /* eslint-enable no-param-reassign */
  });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>['base']>;

export { createConfigureSchema };
