import {
  defineGoalSchema,
  MAX_EVALUATION_GOAL_LENGTH,
  suiteBuilderDefaultValues,
  suiteBuilderSchema,
  suiteSettingsFieldNames,
  suiteSettingsSchema,
} from '~/app/schemas/suiteBuilder.schema';

const RECOMMENDATION_MODEL_ID = 'preview-granite-3b';

describe('suite builder schemas', () => {
  it('should trim and require the suite name', () => {
    expect(
      suiteSettingsSchema.parse({
        ...suiteBuilderDefaultValues,
        suiteName: '  Reasoning suite  ',
        suiteDomains: ['Reasoning'],
      }).suiteName,
    ).toBe('Reasoning suite');

    expect(
      suiteSettingsSchema.safeParse({
        ...suiteBuilderDefaultValues,
        suiteName: '   ',
        suiteDomains: ['Reasoning'],
      }).success,
    ).toBe(false);
  });

  it('should require at least one category', () => {
    expect(
      suiteSettingsSchema.safeParse({
        ...suiteBuilderDefaultValues,
        suiteName: 'Reasoning suite',
        suiteDomains: [],
      }).success,
    ).toBe(false);
  });

  it('should expose a settings-only schema and field list', () => {
    expect(
      suiteSettingsSchema.safeParse({
        ...suiteBuilderDefaultValues,
        suiteName: 'Reasoning suite',
        suiteDomains: ['Reasoning'],
      }).success,
    ).toBe(true);
    expect(suiteSettingsFieldNames).toEqual(['suiteName', 'suiteDescription', 'suiteDomains']);
  });

  it('should trim, require, and limit the evaluation goal', () => {
    expect(
      defineGoalSchema.parse({
        evaluationGoal: '  Compare responses.  ',
        generatorModelId: RECOMMENDATION_MODEL_ID,
      }).evaluationGoal,
    ).toBe('Compare responses.');
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: '   ',
        generatorModelId: RECOMMENDATION_MODEL_ID,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: 'a'.repeat(MAX_EVALUATION_GOAL_LENGTH),
        generatorModelId: RECOMMENDATION_MODEL_ID,
      }).success,
    ).toBe(true);
    expect(
      defineGoalSchema.safeParse({
        evaluationGoal: 'a'.repeat(MAX_EVALUATION_GOAL_LENGTH + 1),
        generatorModelId: RECOMMENDATION_MODEL_ID,
      }).success,
    ).toBe(false);
    expect(
      defineGoalSchema.safeParse({ evaluationGoal: 'Valid goal', generatorModelId: '' }).success,
    ).toBe(false);
  });

  it('should compose the settings and evaluation goal schemas', () => {
    expect(suiteBuilderDefaultValues.generatorModelId).toBe('');
    expect(
      suiteBuilderSchema.parse({
        ...suiteBuilderDefaultValues,
        suiteName: 'Reasoning suite',
        suiteDomains: ['Reasoning'],
        evaluationGoal: 'Evaluate factual accuracy.',
        generatorModelId: RECOMMENDATION_MODEL_ID,
      }),
    ).toEqual({
      ...suiteBuilderDefaultValues,
      suiteName: 'Reasoning suite',
      suiteDomains: ['Reasoning'],
      evaluationGoal: 'Evaluate factual accuracy.',
      generatorModelId: RECOMMENDATION_MODEL_ID,
    });
  });
});
