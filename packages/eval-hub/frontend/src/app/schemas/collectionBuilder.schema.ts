/* eslint-disable camelcase */
import * as z from 'zod';
import { MAX_COLLECTION_BENCHMARKS } from '~/app/pages/const';
import { getGenerationModelUrlValidationError } from '~/app/utils/validationUtils';

export const suiteSettingsSchema = z.object({
  suiteName: z.string().trim().min(1, 'Enter a collection name.'),
  suiteDescription: z.string(),
  maxBenchmarks: z.number().int().min(1).max(MAX_COLLECTION_BENCHMARKS),
});

export const recommendationSettingsSchema = z.object({
  strictness: z.enum(['lenient', 'moderate', 'strict']),
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
    .max(MAX_COLLECTION_BENCHMARKS, `Select no more than ${MAX_COLLECTION_BENCHMARKS} benchmarks.`),
});

export const collectionSettingsFieldNames = [
  'suiteName',
  'suiteDescription',
  'maxBenchmarks',
  'generatorModel',
  'strictness',
  'generationEffort',
  'frameworkFilter',
] as const;

export const MAX_EVALUATION_GOAL_LENGTH = 10000;
export const defineGoalFieldNames = ['evaluationGoal'] as const;

export const generatorModelSelectionSchema = z.object({
  source: z.enum(['cluster', 'external']),
  name: z.string().trim().min(1, 'Model name is required.'),
  url: z
    .string()
    .trim()
    .superRefine((url, context) => {
      const error = getGenerationModelUrlValidationError(url);
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
};

export const defineGoalSchema = z.object(defineGoalShape);

export const collectionGenerationSettingsSchema = suiteSettingsSchema
  .extend({
    generatorModel: generatorModelSelectionSchema
      .nullable()
      .refine((value): boolean => value !== null, {
        message: 'Select a recommendation model.',
      }),
    frameworkFilter: z.array(z.string()),
  })
  .extend(recommendationSettingsSchema.shape);

export const collectionBuilderSchema = collectionGenerationSettingsSchema
  .extend(defineGoalShape)
  .extend(benchmarkOverviewSchema.shape);

export type CollectionBuilderFormValues = z.infer<typeof collectionBuilderSchema>;

export const collectionBuilderDefaultValues: CollectionBuilderFormValues = {
  suiteName: '',
  suiteDescription: '',
  maxBenchmarks: 12,
  strictness: 'moderate',
  generationEffort: 'standard',
  frameworkFilter: [],
  selectedBenchmarks: [],
  evaluationGoal: '',
  generatorModel: null,
};
/* eslint-enable camelcase */
