import { GetEntities, GetEntityByName } from './entities';
import { GetFeatureByName, GetFeatures } from './features';
import { GetProjects } from './featureStoreProjects';
import { GetFeatureViews } from './featureView';
import { GetFeatureServices } from './featureServices';

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

export type FeatureStoreMeta = {
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
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
};
