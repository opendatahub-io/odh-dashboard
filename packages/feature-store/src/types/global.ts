import { GetEntities, GetEntityByName } from './entities';
import { GetFeatureByName, GetFeatures } from './features';
import { GetProjects } from './featureStoreProjects';
import { GetFeatureViews, GetFeatureViewsByName } from './featureView';
import { GetFeatureViewLineage, GetLineageData } from './lineage';
import { GetFeatureServiceByName, GetFeatureServices } from './featureServices';
import { GetMetricsResourceCount, GetPopularTags, GetRecentlyVisitedResources } from './metrics';
import { GetDataSetByName, GetSavedDatasets } from './dataSets';
import { GetDataSources, GetDataSourceByName } from './dataSources';

export type FeatureStorePagination = {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type FeatureStoreError = {
  code?: string;
  message?: string;
  detail?: string;
};

export type MaterializationInterval = {
  startTime: string;
  endTime: string;
};

export type FeatureStoreMeta = {
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
  materializationIntervals?: MaterializationInterval[];
};

export type FileOptions = {
  fileFormat?: {
    parquetFormat: Record<string, string>;
  };
  uri: string;
};

export type NameValueTypePair = {
  name: string;
  valueType: string;
  description?: string;
};

export type BatchSource = {
  type: string;
  timestampField: string;
  createdTimestampColumn: string;
  fileOptions: FileOptions;
  name: string;
  description?: string;
  tags?: Record<string, string>;
  dataSourceClassType?: string;
  meta?: FeatureStoreMeta;
};

export type FeatureStoreRelationship = {
  source: {
    type: string;
    name: string;
  };
  target: {
    type: string;
    name: string;
  };
};

export type FeatureStoreAPIs = {
  listFeatureStoreProject: GetProjects;
  getEntities: GetEntities;
  getFeatureViews: GetFeatureViews;
  getEntityByName: GetEntityByName;
  getFeatures: GetFeatures;
  getFeatureByName: GetFeatureByName;
  getFeatureServices: GetFeatureServices;
  getFeatureServiceByName: GetFeatureServiceByName;
  getFeatureViewByName: GetFeatureViewsByName;
  getMetricsResourceCount: GetMetricsResourceCount;
  getPopularTags: GetPopularTags;
  getRecentlyVisitedResources: GetRecentlyVisitedResources;
  getLineageData: GetLineageData;
  getFeatureViewLineage: GetFeatureViewLineage;
  getSavedDatasets: GetSavedDatasets;
  getDataSetByName: GetDataSetByName;
  getDataSources: GetDataSources;
  getDataSourceByName: GetDataSourceByName;
};
