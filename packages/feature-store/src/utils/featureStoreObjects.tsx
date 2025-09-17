/* eslint-disable camelcase */
import React from 'react';
import { CubeIcon } from '@patternfly/react-icons';
import {
  chart_color_blue_200 as chartColorBlue,
  chart_color_green_200 as chartColorGreen,
  chart_color_purple_200 as chartColorPurple,
  chart_color_black_500 as chartColorBlack,
} from '@patternfly/react-tokens';
import DataSourceIcon from '../icons/lineage-icons/DataSourceIcon';
import FeatureViewIcon from '../icons/lineage-icons/FeatureViewIcon';
import FeatureServiceIcon from '../icons/lineage-icons/FeatureServiceIcon';
import EntityIcon from '../icons/lineage-icons/EntityIcon';

export type FsObjectType = 'entity' | 'data_source' | 'feature_view' | 'feature_service';

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
