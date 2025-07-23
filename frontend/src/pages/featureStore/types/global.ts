import { GetEntities } from './entities';
import { GetProjects } from './featureStoreProjects';

export type FeatureStorePagination = {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type FeatureStoreError = {
  code: string;
  message: string;
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

export type FeatureStoreAPIs = {
  listFeatureStoreProject: GetProjects;
  getEntities: GetEntities;
};
