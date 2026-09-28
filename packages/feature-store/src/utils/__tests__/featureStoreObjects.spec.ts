import {
  getEntityTypeFsObjectType,
  LINEAGE_OBJECT_TYPE_LEGEND,
  LineageEntityType,
} from '../featureStoreObjects';

describe('getEntityTypeFsObjectType', () => {
  it('maps known entity types to feature store object types', () => {
    expect(getEntityTypeFsObjectType('entity')).toBe('entity');
    expect(getEntityTypeFsObjectType('batch_data_source')).toBe('data_source');
    expect(getEntityTypeFsObjectType('push_data_source')).toBe('data_source');
    expect(getEntityTypeFsObjectType('request_data_source')).toBe('data_source');
    expect(getEntityTypeFsObjectType('batch_feature_view')).toBe('feature_view');
    expect(getEntityTypeFsObjectType('on_demand_feature_view')).toBe('feature_view');
    expect(getEntityTypeFsObjectType('stream_feature_view')).toBe('feature_view');
    expect(getEntityTypeFsObjectType('feature_service')).toBe('feature_service');
  });

  it('falls back to feature_store for unknown entity types', () => {
    expect(getEntityTypeFsObjectType('unknown_type' as LineageEntityType)).toBe('feature_store');
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
