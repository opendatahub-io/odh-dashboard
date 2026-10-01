/* eslint-disable camelcase */
import { FeatureStoreObjectType } from '../utils';

export type FsObjectType = 'entity' | 'data_source' | 'feature_view' | 'feature_service';

/** Compact badge for lineage pills; overview surfaces use FeatureStoreObjectIcon default (40px). */
export const LINEAGE_PILL_ICON_SIZE = 24;

export type LineageEntityType =
  | 'entity'
  | 'batch_data_source'
  | 'push_data_source'
  | 'request_data_source'
  | 'batch_feature_view'
  | 'on_demand_feature_view'
  | 'stream_feature_view'
  | 'feature_service';

export const LINEAGE_OBJECT_TYPE_LEGEND: { type: FsObjectType; label: string }[] = [
  { type: 'entity', label: 'Entity' },
  { type: 'data_source', label: 'Data source' },
  { type: 'feature_view', label: 'Feature view' },
  { type: 'feature_service', label: 'Feature service' },
];

export const getEntityTypeFsObjectType = (entityType: LineageEntityType): FeatureStoreObjectType =>
  entityTypeToFsObjectType(entityType);

const entityTypeToFsObjectType = (entityType: LineageEntityType): FeatureStoreObjectType => {
  switch (entityType) {
    case 'entity':
      return 'entity';
    case 'batch_data_source':
    case 'push_data_source':
    case 'request_data_source':
      return 'data_source';
    case 'batch_feature_view':
    case 'on_demand_feature_view':
    case 'stream_feature_view':
      return 'feature_view';
    case 'feature_service':
      return 'feature_service';
    default:
      return 'feature_store';
  }
};

export const getFsObjectTypeLabel = (fsObjectType: FsObjectType): string => {
  const typeLabels: Record<FsObjectType, string> = {
    entity: 'Entity details',
    data_source: 'Data source details',
    feature_view: 'Feature view details',
    feature_service: 'Feature service details',
  };
  return typeLabels[fsObjectType] || fsObjectType;
};
