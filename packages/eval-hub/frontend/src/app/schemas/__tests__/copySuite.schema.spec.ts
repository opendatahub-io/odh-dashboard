import {
  copySuiteDefaultValues,
  copySuiteSchema,
  getCopySuiteSchema,
  type CopySuiteFormValues,
} from '~/app/schemas/copySuite.schema';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';

const validValues = (): CopySuiteFormValues => ({
  ...copySuiteDefaultValues,
  suiteName: 'My copied suite',
  benchmarks: [
    {
      id: 'benchmark-one',
      providerId: 'provider-one',
      name: 'Benchmark one',
      weight: 1,
      parameters: [],
      threshold: 70,
      availableMetrics: ['accuracy'],
      testDataRef: { ...testDataRefDefaultValues },
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
      suiteDomains: ['trustworthiness', 'knowledge_and_reasoning'],
      suiteTasks: ['reasoning'],
      suiteModalities: ['text', 'vision'],
      suiteIndustries: ['health'],
    });

    expect(result.success).toBe(true);
  });

  it('should reject a copy that keeps the source benchmark suite name', () => {
    const result = getCopySuiteSchema('Source suite').safeParse({
      ...validValues(),
      suiteName: ' Source suite ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['suiteName'],
            message: 'Collection name must be different from the source collection name.',
          }),
        ]),
      );
    }
  });

  it('should accept raw metric thresholds above the percentage slider range', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          primaryMetric: 'output_tokens_per_second',
          threshold: 250,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should reject percentage thresholds above 100', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          primaryMetric: 'accuracy',
          threshold: 101,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['benchmarks', 0, 'threshold'],
            message: 'Percentage thresholds cannot exceed 100.',
          }),
        ]),
      );
    }
  });

  it('should accept a percentage threshold of exactly 100', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          primaryMetric: 'accuracy',
          threshold: 100,
        },
      ],
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

  it('should reject benchmark parameter values that do not match their declared type', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          parameters: [
            { key: 'number', type: 'number', value: '1' },
            { key: 'boolean', type: 'boolean', value: 'true' },
            { key: 'text', type: 'text', value: 1 },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  describe('getCopySuiteSchema required parameters', () => {
    const requiredKeys = new Set(['judge_model']);

    it('should reject missing and empty required parameter values', () => {
      const missing = getCopySuiteSchema(undefined, requiredKeys).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [
              { key: 'judge_model', type: 'text' },
              { key: 'other', type: 'text' },
            ],
          },
        ],
      });
      const empty = getCopySuiteSchema(undefined, requiredKeys).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [{ key: 'judge_model', type: 'text', value: '' }],
          },
        ],
      });

      expect(missing.success).toBe(false);
      expect(empty.success).toBe(false);

      if (!missing.success) {
        expect(missing.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['benchmarks', 0, 'parameters', 0, 'value'],
              message: 'Judge model is required.',
            }),
          ]),
        );
      }
    });

    it('should reject whitespace-only required parameter values', () => {
      const result = getCopySuiteSchema(undefined, requiredKeys).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [{ key: 'judge_model', type: 'text', value: '   ' }],
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['benchmarks', 0, 'parameters', 0, 'value'],
              message: 'Judge model is required.',
            }),
          ]),
        );
      }
    });

    it('should accept falsy but meaningful required parameter values', () => {
      const result = getCopySuiteSchema(
        undefined,
        new Set(['judge_model', 'num', 'flag']),
      ).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [
              { key: 'judge_model', type: 'text', value: 'gpt-4o' },
              { key: 'num', type: 'number', value: 0 },
              { key: 'flag', type: 'boolean', value: false },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should accept a benchmark that omits a required parameter key entirely', () => {
      const result = getCopySuiteSchema(undefined, requiredKeys).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [{ key: 'other', type: 'text' }],
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should accept filled required parameter values', () => {
      const result = getCopySuiteSchema(undefined, requiredKeys).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [{ key: 'judge_model', type: 'text', value: 'gpt-4o' }],
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should not require parameters when no required keys are configured', () => {
      const result = getCopySuiteSchema(undefined).safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            parameters: [{ key: 'judge_model', type: 'text' }],
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('testDataRef', () => {
    it('should accept a benchmark with no test data source', () => {
      const result = copySuiteSchema.safeParse(validValues());
      expect(result.success).toBe(true);
    });

    it('should reject a benchmark with an incomplete test data ref', () => {
      const result = copySuiteSchema.safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            testDataRef: {
              ...testDataRefDefaultValues,
              source: 's3',
              bucket: 'eval-data',
              key: '',
              secretRef: '',
            },
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['benchmarks', 0, 'testDataRef', 'key'],
              message: 'Key is required.',
            }),
            expect.objectContaining({
              path: ['benchmarks', 0, 'testDataRef', 'secretRef'],
              message: 'Secret is required.',
            }),
          ]),
        );
      }
    });

    it('should accept a benchmark with a complete test data ref', () => {
      const result = copySuiteSchema.safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            testDataRef: {
              ...testDataRefDefaultValues,
              source: 'git',
              url: 'https://github.com/org/datasets.git',
              ref: 'main',
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should reject a required-test-data benchmark with no test data source', () => {
      const result = copySuiteSchema.safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            id: 'ragas_rag_default',
            providerId: 'ragas',
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['benchmarks', 0, 'testDataRef', 'source'],
              message: 'Test data source is required for this benchmark.',
            }),
          ]),
        );
      }
    });

    it('should accept a required-test-data benchmark with a complete test data ref', () => {
      const result = copySuiteSchema.safeParse({
        ...validValues(),
        benchmarks: [
          {
            ...validValues().benchmarks[0],
            id: 'ragas_rag_default',
            providerId: 'ragas',
            testDataRef: {
              ...testDataRefDefaultValues,
              source: 's3',
              bucket: 'eval-data',
              key: 'ragas',
              secretRef: 's3-secret',
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });
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

  it('should reject advanced parameters that conflict with dynamic fields', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          parameters: [{ key: 'limit', type: 'number', value: 10 }],
          additionalParameters: '{"limit": 999, "other": "value"}',
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['benchmarks', 0, 'additionalParameters'],
            message: 'Use the dedicated fields for limit.',
          }),
        ]),
      );
    }
  });

  it('should accept advanced parameters when no matching dynamic field exists', () => {
    const result = copySuiteSchema.safeParse({
      ...validValues(),
      benchmarks: [
        {
          ...validValues().benchmarks[0],
          additionalParameters: '{"limit": 999}',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
