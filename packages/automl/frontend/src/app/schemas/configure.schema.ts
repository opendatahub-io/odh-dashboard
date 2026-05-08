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

      // Unified target column — transformed to `label_column` or `target` on submit
      target_column: z.string().default('').optional(),

      // API output fields — present when parsing pipeline run parameters, removed during form submit
      label_column: z.string().default('').optional(),
      target: z.string().default('').optional(),

      id_column: z.string().default('').optional(),
      timestamp_column: z.string().default('').optional(),
      prediction_length: z.int().min(1).max(MAX_PREDICTION_LENGTH).default(1).optional(),
      known_covariates_names: z.array(z.string()).default([]).optional(),
    }),
    validators: [
      // Validate target_column is required for all task types
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        if (TASK_TYPES.some((t) => t === data.task_type)) {
          if (!data.target_column || data.target_column.trim() === '') {
            issues.push({
              code: 'custom',
              path: ['target_column'],
              message: 'Target column is required',
              input: data.target_column,
            });
          }
        }
        return issues;
      },
      // Validate timeseries-specific required fields
      (data) => {
        const issues: z.core.$ZodRawIssue[] = [];
        if (data.task_type === TASK_TYPE_TIMESERIES) {
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
          if (
            data.target_column &&
            data.timestamp_column &&
            data.target_column === data.timestamp_column
          ) {
            issues.push({
              code: 'custom',
              path: ['target_column'],
              message: 'Target column must be different from timestamp column',
              input: data.target_column,
            });
          }
          if (data.target_column && data.id_column && data.target_column === data.id_column) {
            issues.push({
              code: 'custom',
              path: ['target_column'],
              message: 'Target column must be different from ID column',
              input: data.target_column,
            });
          }
          if (data.target_column && data.known_covariates_names?.includes(data.target_column)) {
            issues.push({
              code: 'custom',
              path: ['target_column'],
              message: 'Target column must not be included in known covariates',
              input: data.target_column,
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
      // Map target_column to the correct output field and remove unused fields
      (data) => {
        if (data.task_type === TASK_TYPE_TIMESERIES) {
          data.target = data.target_column;
          delete data.label_column;
        } else {
          data.label_column = data.target_column;
          delete data.target;
          delete data.id_column;
          delete data.timestamp_column;
          delete data.prediction_length;
          delete data.known_covariates_names;
        }
        delete data.target_column;
        return data;
      },
    ],
    /* eslint-enable no-param-reassign */
  });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>['base']>;

export { createConfigureSchema };
