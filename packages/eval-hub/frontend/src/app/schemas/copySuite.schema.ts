import * as z from 'zod';
import { SUITE_EVALUATES_OPTIONS } from '~/app/pages/const';

export const RESERVED_BENCHMARK_PARAMETER_KEYS = ['limit', 'num_few_shot', 'num_fewshot'] as const;

const reservedBenchmarkParameterKeys = new Set<string>(RESERVED_BENCHMARK_PARAMETER_KEYS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getAdditionalParametersError = (value: string | undefined): string | undefined => {
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

  const reservedKeys = Object.keys(parsed).filter((key) => reservedBenchmarkParameterKeys.has(key));
  if (reservedKeys.length > 0) {
    return `Use the dedicated fields for ${reservedKeys.join(', ')}.`;
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
  numSamples: z.number().optional(),
  datasetSize: z.number().optional(),
  numFewShot: z.number().optional(),
  additionalParameters: z.string().optional(),
  threshold: z.number(),
  availableMetrics: z.array(z.string()),
});

export const copySuiteSchema = z
  .object({
    suiteName: z.string().trim().min(1, 'Suite name is required'),
    suiteDescription: z.string(),
    suiteCategory: z.string(),
    suiteEvaluates: z.enum(SUITE_EVALUATES_OPTIONS),
    suiteThreshold: z.number().min(0).max(100),
    benchmarks: z.array(copySuiteBenchmarkSchema).min(1, 'At least one benchmark is required'),
  })
  .superRefine((data, ctx) => {
    data.benchmarks.forEach((benchmark, index) => {
      const error = getAdditionalParametersError(benchmark.additionalParameters);
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
  suiteCategory: '',
  suiteEvaluates: 'agent',
  suiteThreshold: 70,
  benchmarks: [],
};
