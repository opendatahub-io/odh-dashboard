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
export const MAX_TOP_N_TABULAR = 10;
export const MAX_TOP_N_TIMESERIES = 7;
export const MAX_PREDICTION_LENGTH = 100;

export const EXPERIMENT_SETTINGS_FIELDS = ['top_n'] as const;

const TABULAR_TASK_TYPES = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION] as const;
export const TASK_TYPES = [...TABULAR_TASK_TYPES, TASK_TYPE_TIMESERIES] as const;

// Make sure every field has a default to ensure RHF works as intended.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return createSchema({
    schema: z.object({
      // Common fields
      display_name: z
        .string()
        .trim()
        .min(1)
        .refine(
          (val) => Array.from(val).length <= 250,
          'Display name must be at most 250 characters',
        )
        .default(''),
      description: z.string().trim().default('').optional(),
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally invalid default; validated on submit
      task_type: z.enum(TASK_TYPES).default('' as never),
      train_data_secret_name: z.string().min(1).default(''),
      train_data_bucket_name: z.string().min(1).default(''),
      train_data_file_key: z.string().min(1).default(''),
      top_n: z.int().min(MIN_TOP_N, `Minimum number of top models is ${MIN_TOP_N}`).default(3),

      // Tabular-specific fields (optional at base level, validated conditionally)
      label_column: z.string().default('').optional(),

      // Timeseries-specific fields (optional at base level, validated conditionally)
      target: z.string().default('').optional(),
      id_column: z.string().default('').optional(),
      timestamp_column: z.string().default('').optional(),
      prediction_length: z.int().min(1).max(MAX_PREDICTION_LENGTH).default(1).optional(),
      known_covariates_names: z.array(z.string()).default([]).optional(),
    }),
    validators: [
      // Validate tabular-specific required fields
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        if (
          data.task_type !== TASK_TYPE_TIMESERIES &&
          TABULAR_TASK_TYPES.some((t) => t === data.task_type)
        ) {
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
      // Validate top_n based on task type
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        const maxTopN =
          data.task_type === TASK_TYPE_TIMESERIES ? MAX_TOP_N_TIMESERIES : MAX_TOP_N_TABULAR;

        if (data.top_n > maxTopN) {
          issues.push({
            code: 'too_big',
            path: ['top_n'],
            origin: 'int',
            input: data.top_n,
            maximum: maxTopN,
            message: `Maximum number of top models is ${maxTopN}`,
          });
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
