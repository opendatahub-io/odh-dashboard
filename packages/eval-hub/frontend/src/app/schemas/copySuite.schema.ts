import * as z from 'zod';
import { SUITE_EVALUATES_OPTIONS } from '~/app/pages/const';

export const copySuiteBenchmarkParameterTypeSchema = z.enum(['number', 'boolean', 'text']);
export type CopySuiteBenchmarkParameterType = z.infer<typeof copySuiteBenchmarkParameterTypeSchema>;

export const copySuiteBenchmarkParameterSchema = z.object({
  key: z.string().min(1),
  type: copySuiteBenchmarkParameterTypeSchema,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export type CopySuiteBenchmarkParameter = z.infer<typeof copySuiteBenchmarkParameterSchema>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getAdditionalParametersError = (
  value: string | undefined,
  dedicatedParameterKeys: Iterable<string> = [],
): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return 'Advanced benchmark parameters must be valid JSON.';
  }

  if (!isRecord(parsed)) {
    return 'Advanced benchmark parameters must be a JSON object.';
  }

  const dedicatedKeys = new Set(dedicatedParameterKeys);
  const dedicatedKeysInJson = Object.keys(parsed).filter((key) => dedicatedKeys.has(key));
  if (dedicatedKeysInJson.length > 0) {
    return `Use the dedicated fields for ${dedicatedKeysInJson.join(', ')}.`;
  }

  return undefined;
};

export const copySuiteBenchmarkSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  weight: z.number(),
  primaryMetric: z.string().optional(),
  lowerIsBetter: z.boolean().optional(),
  metricDirections: z.record(z.string(), z.boolean()).optional(),
  parameters: z.array(copySuiteBenchmarkParameterSchema),
  additionalParameters: z.string().optional(),
  threshold: z.number().min(0).max(100),
  availableMetrics: z.array(z.string()),
});

export const copySuiteSchema = z
  .object({
    suiteName: z.string().trim().min(1, 'Suite name is required'),
    suiteDescription: z.string(),
    suiteDomains: z.array(z.string()),
    suiteTasks: z.array(z.string()),
    suiteModalities: z.array(z.string()),
    suiteIndustries: z.array(z.string()),
    suiteEvaluates: z.array(z.enum(SUITE_EVALUATES_OPTIONS)),
    suiteThreshold: z.number().min(0).max(100),
    benchmarks: z.array(copySuiteBenchmarkSchema).min(1, 'At least one benchmark is required'),
  })
  .superRefine((data, ctx) => {
    data.benchmarks.forEach((benchmark, index) => {
      const error = getAdditionalParametersError(
        benchmark.additionalParameters,
        benchmark.parameters.map((parameter) => parameter.key),
      );
      if (error) {
        ctx.addIssue({
          code: 'custom',
          message: error,
          path: ['benchmarks', index, 'additionalParameters'],
        });
      }
    });
  });

export type CopySuiteFormValues = z.infer<typeof copySuiteSchema>;
export type CopySuiteBenchmarkFormValues = z.infer<typeof copySuiteBenchmarkSchema>;

export const copySuiteDefaultValues: CopySuiteFormValues = {
  suiteName: '',
  suiteDescription: '',
  suiteDomains: [],
  suiteTasks: [],
  suiteModalities: [],
  suiteIndustries: [],
  suiteEvaluates: [],
  suiteThreshold: 70,
  benchmarks: [],
};
