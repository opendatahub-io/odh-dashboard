/* eslint-disable camelcase */
import {
  defineGoalFieldNames,
  defineGoalSchema,
  MAX_EVALUATION_GOAL_LENGTH,
  suiteBuilderDefaultValues,
  suiteBuilderSchema,
  suiteSettingsFieldNames,
  suiteSettingsSchema,
} from '~/app/schemas/suiteBuilder.schema';

const RECOMMENDATION_MODEL = {
  source: 'cluster' as const,
  name: 'granite-3b',
  url: 'https://granite-3b.example.com/v1',
};

describe('suite builder schemas', () => {
  it('should trim and require the suite name', () => {
    expect(
      suiteSettingsSchema.parse({
        ...suiteBuilderDefaultValues,
        suiteName: '  Reasoning suite  ',
      }).suiteName,
    ).toBe('Reasoning suite');

    expect(
      suiteSettingsSchema.safeParse({
        ...suiteBuilderDefaultValues,
        suiteName: '   ',
      }).success,
    ).toBe(false);
  });

  it('should expose a settings-only schema and field list', () => {
    expect(
      suiteSettingsSchema.safeParse({
        ...suiteBuilderDefaultValues,
        suiteName: 'Reasoning suite',
      }).success,
    ).toBe(true);
    expect(suiteSettingsFieldNames).toEqual(['suiteName', 'suiteDescription']);
  });

  it('should trim, require, and limit the evaluation goal', () => {
    expect(
      defineGoalSchema.parse({
        evaluationGoal: '  Compare responses.  ',
        generatorModel: RECOMMENDATION_MODEL,
      }).evaluationGoal,
    ).toBe('Compare responses.');
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: '   ',
        generatorModel: RECOMMENDATION_MODEL,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: 'a'.repeat(MAX_EVALUATION_GOAL_LENGTH),
        generatorModel: RECOMMENDATION_MODEL,
      }).success,
    ).toBe(true);
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: 'a'.repeat(MAX_EVALUATION_GOAL_LENGTH + 1),
        generatorModel: RECOMMENDATION_MODEL,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({ evaluationGoal: 'Valid goal', generatorModel: null }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: 'Valid goal',
        generatorModel: { ...RECOMMENDATION_MODEL, url: 'not-a-url' },
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
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
    expect(defineGoalFieldNames).toEqual(['evaluationGoal', 'generatorModel']);
  });

  it('should compose the settings and evaluation goal schemas', () => {
    expect(suiteBuilderDefaultValues.generatorModel).toBeNull();
    expect(
      suiteBuilderSchema.parse({
        ...suiteBuilderDefaultValues,
        suiteName: 'Reasoning suite',
        evaluationGoal: 'Evaluate factual accuracy.',
        generatorModel: RECOMMENDATION_MODEL,
      }),
    ).toEqual({
      ...suiteBuilderDefaultValues,
      suiteName: 'Reasoning suite',
      evaluationGoal: 'Evaluate factual accuracy.',
      generatorModel: RECOMMENDATION_MODEL,
    });
  });
});
/* eslint-enable camelcase */
