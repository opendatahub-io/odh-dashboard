import * as z from 'zod';

export const suiteSettingsSchema = z.object({
  suiteName: z.string().trim().min(1, 'Enter a suite name.'),
  suiteDescription: z.string(),
  suiteDomains: z.array(z.string()).min(1, 'Select a category.'),
});

export const suiteSettingsFieldNames = ['suiteName', 'suiteDescription', 'suiteDomains'] as const;

export const MAX_EVALUATION_GOAL_LENGTH = 2000;
export const defineGoalFieldNames = ['evaluationGoal', 'generatorModelId'] as const;

export const defineGoalSchema = z.object({
  evaluationGoal: z
    .string()
    .trim()
    .min(1, 'Enter an evaluation goal.')
    .max(
      MAX_EVALUATION_GOAL_LENGTH,
      `Evaluation goal must be ${MAX_EVALUATION_GOAL_LENGTH.toLocaleString()} characters or fewer.`,
    ),
  generatorModelId: z.string().min(1, 'Select a recommendation model.'),
});

export const suiteBuilderSchema = suiteSettingsSchema.extend(defineGoalSchema.shape);

export type SuiteBuilderFormValues = z.infer<typeof suiteBuilderSchema>;

export const suiteBuilderDefaultValues: SuiteBuilderFormValues = {
  suiteName: '',
  suiteDescription: '',
  suiteDomains: [],
  evaluationGoal: '',
  generatorModelId: '',
};
