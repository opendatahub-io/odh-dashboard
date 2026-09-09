/* eslint-disable camelcase */
import React from 'react';
import { CubeIcon } from '@patternfly/react-icons';
import DataSourceIcon from '../icons/lineage-icons/DataSourceIcon';
import FeatureViewIcon from '../icons/lineage-icons/FeatureViewIcon';
import FeatureServiceIcon from '../icons/lineage-icons/FeatureServiceIcon';
import EntityIcon from '../icons/lineage-icons/EntityIcon';
import {
  FeatureStoreObjectType,
  getFeatureStoreObjectBackgroundColor,
  getFeatureStoreObjectIconColor,
} from '../utils';

export type FsObjectType = 'entity' | 'data_source' | 'feature_view' | 'feature_service';

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
      return 'entity';
  }
};

export const getEntityTypeBackgroundColor = (entityType: LineageEntityType): string =>
  getFeatureStoreObjectBackgroundColor(entityTypeToFsObjectType(entityType));

export const getEntityTypeIconColor = (entityType: LineageEntityType, selected = false): string =>
  selected
    ? 'var(--ai-fs-lineage-pill--AccentIconColor)'
    : getFeatureStoreObjectIconColor(entityTypeToFsObjectType(entityType));

export const LINEAGE_OBJECT_TYPE_LEGEND: {
  type: FsObjectType;
  label: string;
  entityType: LineageEntityType;
}[] = [
  { type: 'entity', label: 'Entity', entityType: 'entity' },
  { type: 'data_source', label: 'Data source', entityType: 'batch_data_source' },
  { type: 'feature_view', label: 'Feature view', entityType: 'batch_feature_view' },
  { type: 'feature_service', label: 'Feature service', entityType: 'feature_service' },
];

export type LineageEntityType =
  | 'entity'
  | 'batch_data_source'
  | 'push_data_source'
  | 'request_data_source'
  | 'batch_feature_view'
  | 'on_demand_feature_view'
  | 'stream_feature_view'
  | 'feature_service';

export const getEntityTypeIcon = (
  entityType: LineageEntityType,
  selected = false,
  iconSizePx = 24,
  inheritColor = false,
): React.ReactNode => {
  const iconSize = { width: `${iconSizePx}px`, height: `${iconSizePx}px` };
  const iconColor = getEntityTypeIconColor(entityType, selected);
  const iconStyle = inheritColor ? iconSize : { color: iconColor, fill: iconColor, ...iconSize };

  switch (entityType) {
    case 'entity':
      return <EntityIcon style={iconStyle} />;
    case 'batch_data_source':
    case 'push_data_source':
    case 'request_data_source':
      return <DataSourceIcon style={iconStyle} />;
    case 'batch_feature_view':
    case 'on_demand_feature_view':
    case 'stream_feature_view':
      return <FeatureViewIcon style={iconStyle} />;
    case 'feature_service':
      return <FeatureServiceIcon style={iconStyle} />;
    default:
      return <CubeIcon style={iconStyle} />;
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
