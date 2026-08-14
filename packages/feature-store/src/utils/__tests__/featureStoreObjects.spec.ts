import {
  chart_color_blue_300 as chartColorBlueAccent,
  chart_color_green_300 as chartColorGreenAccent,
  chart_color_purple_300 as chartColorPurpleAccent,
  chart_color_black_500 as chartColorBlackAccent,
} from '@patternfly/react-tokens';
import {
  getEntityTypeBackgroundColor,
  getEntityTypeAccentColor,
  LINEAGE_OBJECT_TYPE_LEGEND,
} from '../featureStoreObjects';

describe('getEntityTypeBackgroundColor', () => {
  it('returns entity background color token for entity types', () => {
    expect(getEntityTypeBackgroundColor('entity')).toBe('var(--ai-fs-entity--BackgroundColor)');
  });

  it('returns data source background color for all data source subtypes', () => {
    const expected = 'var(--ai-fs-data-source--BackgroundColor)';
    expect(getEntityTypeBackgroundColor('batch_data_source')).toBe(expected);
    expect(getEntityTypeBackgroundColor('push_data_source')).toBe(expected);
    expect(getEntityTypeBackgroundColor('request_data_source')).toBe(expected);
  });

  it('returns feature view background color for all feature view subtypes', () => {
    const expected = 'var(--ai-fs-feature-view--BackgroundColor)';
    expect(getEntityTypeBackgroundColor('batch_feature_view')).toBe(expected);
    expect(getEntityTypeBackgroundColor('on_demand_feature_view')).toBe(expected);
    expect(getEntityTypeBackgroundColor('stream_feature_view')).toBe(expected);
  });

  it('returns feature service background color for feature services', () => {
    expect(getEntityTypeBackgroundColor('feature_service')).toBe(
      'var(--ai-fs-feature-service--BackgroundColor)',
    );
  });
});

describe('getEntityTypeAccentColor', () => {
  it('returns chart accent color tokens for each object type group', () => {
    expect(getEntityTypeAccentColor('entity')).toBe(chartColorBlackAccent.var);
    expect(getEntityTypeAccentColor('batch_data_source')).toBe(chartColorBlueAccent.var);
    expect(getEntityTypeAccentColor('batch_feature_view')).toBe(chartColorPurpleAccent.var);
    expect(getEntityTypeAccentColor('feature_service')).toBe(chartColorGreenAccent.var);
  });
});

describe('LINEAGE_OBJECT_TYPE_LEGEND', () => {
  it('includes all four Feast object categories', () => {
    expect(LINEAGE_OBJECT_TYPE_LEGEND.map((item) => item.type)).toEqual([
      'entity',
      'data_source',
      'feature_view',
      'feature_service',
    ]);
  });
});
