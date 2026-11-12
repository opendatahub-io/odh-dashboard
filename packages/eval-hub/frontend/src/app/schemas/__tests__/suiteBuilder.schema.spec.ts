import {
  suiteBuilderDefaultValues,
  suiteBuilderSchema,
  suiteSettingsFieldNames,
  suiteSettingsSchema,
} from '~/app/schemas/suiteBuilder.schema';

describe('suiteBuilderSchema', () => {
  it('should trim and require the suite name', () => {
    expect(
      suiteBuilderSchema.parse({
        ...suiteBuilderDefaultValues,
        suiteName: '  Reasoning suite  ',
        suiteDomains: ['Reasoning'],
      }).suiteName,
    ).toBe('Reasoning suite');

    expect(
      suiteBuilderSchema.safeParse({
        ...suiteBuilderDefaultValues,
        suiteName: '   ',
        suiteDomains: ['Reasoning'],
      }).success,
    ).toBe(false);
  });

  it('should require at least one category', () => {
    expect(
      suiteBuilderSchema.safeParse({
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
});
