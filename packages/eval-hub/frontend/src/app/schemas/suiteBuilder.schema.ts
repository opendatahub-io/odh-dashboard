/* eslint-disable camelcase */
import * as z from 'zod';
import { getUrlValidationError } from '~/app/utils/validationUtils';

export const suiteSettingsSchema = z.object({
  suiteName: z.string().trim().min(1, 'Enter a collection name.'),
  suiteDescription: z.string(),
  maxBenchmarks: z.number().int().min(1).max(20),
  strictness: z.enum(['', 'lenient', 'moderate', 'strict']),
  generationEffort: z.enum(['low', 'standard', 'high']),
});

export const benchmarkOverviewSchema = z.object({
  selectedBenchmarks: z
    .array(
      z.object({
        id: z.string().min(1),
        provider_id: z.string().optional(),
        url: z.string().optional(),
        weight: z.number().optional(),
        primary_score: z.object({ metric: z.string(), lower_is_better: z.boolean() }).optional(),
        pass_criteria: z.object({ threshold: z.number() }).optional(),
        parameters: z.record(z.string(), z.unknown()).optional(),
        test_data_ref: z
          .object({
            type: z.enum(['data_set', 'pre_recorded_data']).optional(),
            s3: z
              .object({
                bucket: z.string().optional(),
                key: z.string().optional(),
                secret_ref: z.string().optional(),
              })
              .optional(),
            pvc: z
              .object({
                claim_name: z.string().optional(),
                sub_path: z.string().optional(),
              })
              .optional(),
            git: z
              .object({
                url: z.string().optional(),
                ref: z.string().optional(),
                sub_path: z.string().optional(),
                secret_ref: z.string().optional(),
              })
              .optional(),
            hf: z
              .object({
                repo_id: z.string().optional(),
                revision: z.string().optional(),
                sub_path: z.string().optional(),
                secret_ref: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .min(1, 'Select at least one benchmark.')
    .max(20, 'Select no more than 20 benchmarks.'),
});

export const suiteSettingsFieldNames = [
  'suiteName',
  'suiteDescription',
  'maxBenchmarks',
  'strictness',
  'generationEffort',
] as const;

export const MAX_EVALUATION_GOAL_LENGTH = 10000;
export const defineGoalFieldNames = ['evaluationGoal', 'generatorModel'] as const;

export const generatorModelSelectionSchema = z.object({
  source: z.enum(['cluster', 'external']),
  name: z.string().trim().min(1, 'Model name is required.'),
  url: z
    .string()
    .trim()
    .superRefine((url, context) => {
      const error = getUrlValidationError(url);
      if (error) {
        context.addIssue({ code: 'custom', message: error });
      }
    }),
  auth: z.object({ secret_ref: z.string().trim().optional() }).optional(),
});

export type GeneratorModelSelection = z.infer<typeof generatorModelSelectionSchema>;

const defineGoalShape = {
  evaluationGoal: z
    .string()
    .trim()
    .min(1, 'Enter an evaluation goal.')
    .max(
      MAX_EVALUATION_GOAL_LENGTH,
      `Evaluation goal must be ${MAX_EVALUATION_GOAL_LENGTH.toLocaleString()} characters or fewer.`,
    ),
  generatorModel: generatorModelSelectionSchema
    .nullable()
    .refine((value): boolean => value !== null, {
      message: 'Select a recommendation model.',
    }),
};

export const defineGoalSchema = z.object(defineGoalShape);

export const suiteBuilderSchema = suiteSettingsSchema
  .extend(defineGoalShape)
  .extend(benchmarkOverviewSchema.shape);

export type SuiteBuilderFormValues = z.infer<typeof suiteBuilderSchema>;

export const suiteBuilderDefaultValues: SuiteBuilderFormValues = {
  suiteName: '',
  suiteDescription: '',
  maxBenchmarks: 12,
  strictness: 'moderate',
  generationEffort: 'standard',
  selectedBenchmarks: [],
  evaluationGoal: '',
  generatorModel: null,
};
/* eslint-enable camelcase */
