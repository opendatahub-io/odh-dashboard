import React from 'react';
import {
  getEntityTypeBackgroundColor,
  getEntityTypeIcon,
  getEntityTypeIconColor,
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

describe('getEntityTypeIcon', () => {
  it('uses theme icon color tokens for unselected icons', () => {
    const entityIcon = getEntityTypeIcon('entity', false) as React.ReactElement;
    const dataSourceIcon = getEntityTypeIcon('batch_data_source', false) as React.ReactElement;
    const featureViewIcon = getEntityTypeIcon('batch_feature_view', false) as React.ReactElement;
    const featureServiceIcon = getEntityTypeIcon('feature_service', false) as React.ReactElement;

    expect(entityIcon.props.style?.color).toBe('var(--ai-fs-entity--IconColor)');
    expect(entityIcon.props.style?.fill).toBe('var(--ai-fs-entity--IconColor)');
    expect(dataSourceIcon.props.style?.color).toBe('var(--ai-fs-data-source--IconColor)');
    expect(featureViewIcon.props.style?.color).toBe('var(--ai-fs-feature-view--IconColor)');
    expect(featureServiceIcon.props.style?.color).toBe('var(--ai-fs-feature-service--IconColor)');
  });

  it('uses theme icon colors for legend swatches', () => {
    expect(getEntityTypeIconColor('entity')).toBe('var(--ai-fs-entity--IconColor)');
    expect(getEntityTypeIconColor('batch_data_source')).toBe('var(--ai-fs-data-source--IconColor)');

    const entityIcon = getEntityTypeIcon('entity', false, 16, true) as React.ReactElement;
    const dataSourceIcon = getEntityTypeIcon(
      'batch_data_source',
      false,
      16,
      true,
    ) as React.ReactElement;

    expect(entityIcon.props.style?.color).toBeUndefined();
    expect(entityIcon.props.style?.fill).toBeUndefined();
    expect(dataSourceIcon.props.style?.color).toBeUndefined();
  });

  it('uses a contrasting icon color when selected', () => {
    expect(getEntityTypeIconColor('entity', true)).toBe(
      'var(--ai-fs-lineage-pill--AccentIconColor)',
    );

    const entityIcon = getEntityTypeIcon('entity', true) as React.ReactElement;
    expect(entityIcon.props.style?.color).toBe('var(--ai-fs-lineage-pill--AccentIconColor)');
    expect(entityIcon.props.style?.fill).toBe('var(--ai-fs-lineage-pill--AccentIconColor)');
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
