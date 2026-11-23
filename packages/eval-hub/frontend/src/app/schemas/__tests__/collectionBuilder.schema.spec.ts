/* eslint-disable camelcase */
import {
  benchmarkOverviewSchema,
  defineGoalFieldNames,
  defineGoalSchema,
  MAX_EVALUATION_GOAL_LENGTH,
  collectionBuilderDefaultValues,
  collectionBuilderSchema,
  collectionSettingsFieldNames,
  recommendationSettingsSchema,
  suiteSettingsSchema,
} from '~/app/schemas/collectionBuilder.schema';

const RECOMMENDATION_MODEL = {
  source: 'cluster' as const,
  name: 'granite-3b',
  url: 'https://granite-3b.example.com/v1',
};
const DEFAULT_RECOMMENDATION_SETTINGS = {
  strictness: 'moderate' as const,
  generationEffort: 'standard' as const,
};

describe('suite builder schemas', () => {
  it('should trim and require the collection name', () => {
    expect(
      suiteSettingsSchema.parse({
        ...collectionBuilderDefaultValues,
        suiteName: '  Reasoning suite  ',
      }).suiteName,
    ).toBe('Reasoning suite');

    expect(
      suiteSettingsSchema.safeParse({
        ...collectionBuilderDefaultValues,
        suiteName: '   ',
      }).success,
    ).toBe(false);
  });

  it('should expose a settings-only schema and field list', () => {
    expect(
      suiteSettingsSchema.safeParse({
        ...collectionBuilderDefaultValues,
        suiteName: 'Reasoning suite',
      }).success,
    ).toBe(true);
    expect(collectionSettingsFieldNames).toEqual([
      'suiteName',
      'suiteDescription',
      'maxBenchmarks',
    ]);
  });

  it('should default optional generation settings and validate supplied values', () => {
    expect(collectionBuilderDefaultValues.maxBenchmarks).toBe(12);
    expect(collectionBuilderDefaultValues.strictness).toBe('moderate');
    expect(collectionBuilderDefaultValues.generationEffort).toBe('standard');
    expect(recommendationSettingsSchema.safeParse(DEFAULT_RECOMMENDATION_SETTINGS).success).toBe(
      true,
    );

    for (const maxBenchmarks of [1, 12, 20]) {
      expect(
        suiteSettingsSchema.safeParse({
          ...collectionBuilderDefaultValues,
          suiteName: 'Reasoning suite',
          maxBenchmarks,
        }).success,
      ).toBe(true);
    }

    for (const maxBenchmarks of [0, 21, 1.5, Number.NaN]) {
      expect(
        suiteSettingsSchema.safeParse({
          ...collectionBuilderDefaultValues,
          suiteName: 'Reasoning suite',
          maxBenchmarks,
        }).success,
      ).toBe(false);
    }

    for (const strictness of ['lenient', 'moderate', 'strict'] as const) {
      expect(
        recommendationSettingsSchema.safeParse({
          ...DEFAULT_RECOMMENDATION_SETTINGS,
          strictness,
        }).success,
      ).toBe(true);
    }
    expect(
      recommendationSettingsSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        strictness: 'unknown',
      }).success,
    ).toBe(false);

    for (const generationEffort of ['low', 'standard', 'high'] as const) {
      expect(
        recommendationSettingsSchema.safeParse({
          ...DEFAULT_RECOMMENDATION_SETTINGS,
          generationEffort,
        }).success,
      ).toBe(true);
    }
    expect(
      recommendationSettingsSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        generationEffort: 'invalid',
      }).success,
    ).toBe(false);
  });

  it('should trim, require, and limit the evaluation goal', () => {
    expect(
      defineGoalSchema.parse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: '  Compare responses.  ',
        generatorModel: RECOMMENDATION_MODEL,
      }).evaluationGoal,
    ).toBe('Compare responses.');
    expect(
      defineGoalSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: '   ',
        generatorModel: RECOMMENDATION_MODEL,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: 'a'.repeat(MAX_EVALUATION_GOAL_LENGTH),
        generatorModel: RECOMMENDATION_MODEL,
      }).success,
    ).toBe(true);
    expect(
      defineGoalSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: 'a'.repeat(MAX_EVALUATION_GOAL_LENGTH + 1),
        generatorModel: RECOMMENDATION_MODEL,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: 'Valid goal',
        generatorModel: null,
      }).success,
    ).toBe(false);
    expect(
      collectionBuilderSchema.safeParse({
        ...collectionBuilderDefaultValues,
        suiteName: 'Reasoning suite',
        evaluationGoal: 'Valid goal',
        generatorModel: null,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: 'Valid goal',
        generatorModel: { ...RECOMMENDATION_MODEL, url: 'not-a-url' },
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: 'Valid goal',
        generatorModel: {
          source: 'external',
          name: '  my-external-model  ',
          url: '  https://external.example.com/v1  ',
          auth: { secret_ref: '  external-secret  ' },
        },
      }).data?.generatorModel,
    ).toEqual({
      source: 'external',
      name: 'my-external-model',
      url: 'https://external.example.com/v1',
      auth: { secret_ref: 'external-secret' },
    });
    expect(
      defineGoalSchema.parse({
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        evaluationGoal: 'Valid goal',
        generatorModel: {
          source: 'external',
          name: 'my-external-model',
          url: 'https://external.example.com/v1',
        },
      }).generatorModel,
    ).toEqual({
      source: 'external',
      name: 'my-external-model',
      url: 'https://external.example.com/v1',
    });
    expect(defineGoalFieldNames).toEqual([
      'evaluationGoal',
      'generatorModel',
      'strictness',
      'generationEffort',
    ]);
  });

  it('should compose the settings and evaluation goal schemas', () => {
    expect(collectionBuilderDefaultValues.generatorModel).toBeNull();
    expect(
      collectionBuilderSchema.parse({
        ...collectionBuilderDefaultValues,
        suiteName: 'Reasoning suite',
        maxBenchmarks: 20,
        strictness: 'strict',
        evaluationGoal: 'Evaluate factual accuracy.',
        generatorModel: RECOMMENDATION_MODEL,
        selectedBenchmarks: [{ id: 'truthfulqa_mc1', provider_id: 'provider-a' }],
      }),
    ).toEqual({
      ...collectionBuilderDefaultValues,
      suiteName: 'Reasoning suite',
      maxBenchmarks: 20,
      strictness: 'strict',
      evaluationGoal: 'Evaluate factual accuracy.',
      generatorModel: RECOMMENDATION_MODEL,
      selectedBenchmarks: [{ id: 'truthfulqa_mc1', provider_id: 'provider-a' }],
    });
  });

  it('should require 1 to 20 selected benchmarks for the overview step', () => {
    expect(benchmarkOverviewSchema.safeParse({ selectedBenchmarks: [] }).success).toBe(false);
    expect(
      benchmarkOverviewSchema.safeParse({
        selectedBenchmarks: [{ id: 'benchmark-1', provider_id: 'provider-a' }],
      }).success,
    ).toBe(true);
    expect(
      benchmarkOverviewSchema.safeParse({
        selectedBenchmarks: Array.from({ length: 20 }, (_, index) => ({
          id: `benchmark-${index}`,
          provider_id: 'provider-a',
        })),
      }).success,
    ).toBe(true);
    expect(
      benchmarkOverviewSchema.safeParse({
        selectedBenchmarks: Array.from({ length: 21 }, (_, index) => ({
          id: `benchmark-${index}`,
          provider_id: 'provider-a',
        })),
      }).success,
    ).toBe(false);
  });
});
/* eslint-enable camelcase */
