import {
  copySuiteDefaultValues,
  copySuiteSchema,
  type CopySuiteFormValues,
} from '~/app/schemas/copySuite.schema';

const validValues = (): CopySuiteFormValues => ({
  ...copySuiteDefaultValues,
  suiteName: 'My copied suite',
  benchmarks: [
    {
      id: 'benchmark-one',
      providerId: 'provider-one',
      name: 'Benchmark one',
      weight: 1,
      threshold: 70,
      availableMetrics: ['accuracy'],
    },
  ],
});

describe('copySuiteSchema', () => {
  it('should accept empty and valid JSON-object advanced parameters', () => {
    expect(copySuiteSchema.safeParse(validValues()).success).toBe(true);

    expect(
      copySuiteSchema.safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            additionalParameters: '{"blocking_subtask": "harmless"}',
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('should accept multiple evaluates and collection metadata values', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      suiteEvaluates: ['model', 'agent'],
      suiteDomains: ['safety', 'knowledge_and_reasoning'],
      suiteTasks: ['reasoning'],
      suiteModalities: ['text', 'vision'],
      suiteIndustries: ['health'],
    });

    expect(result.success).toBe(true);
  });

  it('should reject scalar or unsupported evaluates values', () => {
    const scalar = copySuiteSchema.safeParse({
      ...validValues(),
      suiteEvaluates: 'agent',
    });
    const unsupported = copySuiteSchema.safeParse({
      ...validValues(),
      suiteEvaluates: ['dataset'],
    });

    expect(scalar.success).toBe(false);
    expect(unsupported.success).toBe(false);
  });

  it('should reject malformed and non-object advanced parameters', () => {
    const malformed = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [{ ...validValues().benchmarks[0], additionalParameters: '{invalid json' }],
    });
    const array = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [{ ...validValues().benchmarks[0], additionalParameters: '[]' }],
    });

    expect(malformed.success).toBe(false);
    expect(array.success).toBe(false);

    if (!malformed.success) {
      expect(malformed.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['benchmarks', 0, 'additionalParameters'],
            message: 'Advanced benchmark parameters must be valid JSON.',
          }),
        ]),
      );
    }
    if (!array.success) {
      expect(array.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['benchmarks', 0, 'additionalParameters'],
            message: 'Advanced benchmark parameters must be a JSON object.',
          }),
        ]),
      );
    }
  });

  it('should reject advanced parameters that conflict with dedicated fields', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          additionalParameters: '{"limit": 999, "num_few_shot": 4}',
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['benchmarks', 0, 'additionalParameters'],
            message: 'Use the dedicated fields for limit, num_few_shot.',
          }),
        ]),
      );
    }
  });
});
