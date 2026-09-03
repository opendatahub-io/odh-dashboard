import React from 'react';
import {
  chart_color_blue_200 as chartColorBlue,
  chart_color_blue_300 as chartColorBlueAccent,
  chart_color_green_200 as chartColorGreen,
  chart_color_green_300 as chartColorGreenAccent,
  chart_color_purple_200 as chartColorPurple,
  chart_color_purple_300 as chartColorPurpleAccent,
  chart_color_black_500 as chartColorBlack,
  chart_color_black_500 as chartColorBlackAccent,
} from '@patternfly/react-tokens';
import {
  getEntityTypeBackgroundColor,
  getEntityTypeAccentColor,
  getEntityTypeIcon,
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

describe('getEntityTypeIcon', () => {
  it('uses chart color tokens for unselected icons', () => {
    const entityIcon = getEntityTypeIcon('entity', false) as React.ReactElement;
    const dataSourceIcon = getEntityTypeIcon('batch_data_source', false) as React.ReactElement;
    const featureViewIcon = getEntityTypeIcon('batch_feature_view', false) as React.ReactElement;
    const featureServiceIcon = getEntityTypeIcon('feature_service', false) as React.ReactElement;

    expect(entityIcon.props.style?.color).toBe(chartColorBlack.var);
    expect(dataSourceIcon.props.style?.color).toBe(chartColorBlue.var);
    expect(featureViewIcon.props.style?.color).toBe(chartColorPurple.var);
    expect(featureServiceIcon.props.style?.color).toBe(chartColorGreen.var);
  });

  it('uses a contrasting icon color on the entity accent strip', () => {
    const entityIcon = getEntityTypeIcon('entity', false, true) as React.ReactElement;
    expect(entityIcon.props.style?.color).toBe('#ffffff');
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
