/* eslint-disable camelcase */
import * as z from 'zod';
import { getUrlValidationError } from '~/app/utils/validationUtils';

export const suiteSettingsSchema = z.object({
  suiteName: z.string().trim().min(1, 'Enter a suite name.'),
  suiteDescription: z.string(),
  maxBenchmarks: z
    .string()
    .refine(
      (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 50),
      'Enter a whole number between 1 and 50.',
    ),
  strictness: z.enum(['', 'lenient', 'moderate', 'strict']),
});

export const suiteSettingsFieldNames = [
  'suiteName',
  'suiteDescription',
  'maxBenchmarks',
  'strictness',
] as const;

export const MAX_EVALUATION_GOAL_LENGTH = 2000;
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
  generatorModel: generatorModelSelectionSchema.nullable(),
};

const requireGeneratorModel = (
  values: { generatorModel: GeneratorModelSelection | null },
  context: z.RefinementCtx,
) => {
  if (values.generatorModel === null) {
    context.addIssue({
      code: 'custom',
      path: ['generatorModel'],
      message: 'Select a recommendation model.',
    });
  }
};

export const defineGoalSchema = z.object(defineGoalShape).superRefine(requireGeneratorModel);

export const suiteBuilderSchema = suiteSettingsSchema
  .extend(defineGoalShape)
  .superRefine(requireGeneratorModel);

export type SuiteBuilderFormValues = z.infer<typeof suiteBuilderSchema>;

export const suiteBuilderDefaultValues: SuiteBuilderFormValues = {
  suiteName: '',
  suiteDescription: '',
  maxBenchmarks: '12',
  strictness: 'moderate',
  evaluationGoal: '',
  generatorModel: null,
};
/* eslint-enable camelcase */
