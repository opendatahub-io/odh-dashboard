/* eslint-disable camelcase */
import React from 'react';
import { DatabaseIcon, CubeIcon, CodeBranchIcon, BuildIcon } from '@patternfly/react-icons';
import {
  chart_color_blue_200 as chartColorBlue,
  chart_color_green_200 as chartColorGreen,
  chart_color_purple_200 as chartColorPurple,
  chart_color_black_500 as chartColorBlack,
} from '@patternfly/react-tokens';

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

  switch (entityType) {
    case 'entity':
      return <CodeBranchIcon style={{ color: iconColor || chartColorBlack.value }} />;
    case 'batch_data_source':
    case 'push_data_source':
    case 'request_data_source':
      return <DatabaseIcon style={{ color: iconColor || chartColorBlue.value }} />;
    case 'batch_feature_view':
    case 'on_demand_feature_view':
    case 'stream_feature_view':
      return <BuildIcon style={{ color: iconColor || chartColorPurple.value }} />;
    case 'feature_service':
      return <BuildIcon style={{ color: iconColor || chartColorGreen.value }} />;
    default:
      return <CubeIcon style={{ color: iconColor || chartColorBlack.value }} />;
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
