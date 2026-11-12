import * as z from 'zod';

export const suiteSettingsSchema = z.object({
  suiteName: z.string().trim().min(1, 'Enter a suite name.'),
  suiteDescription: z.string(),
  suiteDomains: z.array(z.string()).min(1, 'Select a category.'),
});

export const suiteSettingsFieldNames = ['suiteName', 'suiteDescription', 'suiteDomains'] as const;

export const suiteBuilderSchema = suiteSettingsSchema;

export type SuiteBuilderFormValues = z.infer<typeof suiteBuilderSchema>;

export const suiteBuilderDefaultValues: SuiteBuilderFormValues = {
  suiteName: '',
  suiteDescription: '',
  suiteDomains: [],
};
