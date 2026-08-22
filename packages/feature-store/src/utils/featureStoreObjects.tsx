/* eslint-disable camelcase */
import React from 'react';
import { CubeIcon } from '@patternfly/react-icons';
import {
  chart_color_blue_200 as chartColorBlue,
  chart_color_blue_300 as chartColorBlueAccent,
  chart_color_green_200 as chartColorGreen,
  chart_color_green_300 as chartColorGreenAccent,
  chart_color_purple_200 as chartColorPurple,
  chart_color_purple_300 as chartColorPurpleAccent,
  chart_color_black_500 as chartColorBlack,
} from '@patternfly/react-tokens';
import DataSourceIcon from '../icons/lineage-icons/DataSourceIcon';
import FeatureViewIcon from '../icons/lineage-icons/FeatureViewIcon';
import FeatureServiceIcon from '../icons/lineage-icons/FeatureServiceIcon';
import EntityIcon from '../icons/lineage-icons/EntityIcon';
import { FeatureStoreObjectType, getFeatureStoreObjectBackgroundColor } from '../utils';

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

/** Dark accent used on the icon strip (upstream Feast two-tone node pattern). */
export const getEntityTypeAccentColor = (entityType: LineageEntityType): string => {
  switch (entityTypeToFsObjectType(entityType)) {
    case 'entity':
      return chartColorBlack.var;
    case 'data_source':
      return chartColorBlueAccent.var;
    case 'feature_view':
      return chartColorPurpleAccent.var;
    case 'feature_service':
      return chartColorGreenAccent.var;
    default:
      return chartColorBlack.var;
  }
};

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
): React.ReactNode => {
  const iconColor = selected ? '#ffffff' : undefined;
  const iconSize = { width: '24px', height: '24px' };

  switch (entityType) {
    case 'entity':
      return <EntityIcon style={{ color: iconColor || chartColorBlack.value, ...iconSize }} />;
    case 'batch_data_source':
    case 'push_data_source':
    case 'request_data_source':
      return <DataSourceIcon style={{ color: iconColor || chartColorBlue.value, ...iconSize }} />;
    case 'batch_feature_view':
    case 'on_demand_feature_view':
    case 'stream_feature_view':
      return (
        <FeatureViewIcon style={{ color: iconColor || chartColorPurple.value, ...iconSize }} />
      );
    case 'feature_service':
      return (
        <FeatureServiceIcon style={{ color: iconColor || chartColorGreen.value, ...iconSize }} />
      );
    default:
      return <CubeIcon style={{ color: iconColor || chartColorBlack.value, ...iconSize }} />;
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
