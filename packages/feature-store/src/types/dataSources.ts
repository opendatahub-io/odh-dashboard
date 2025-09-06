import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStorePagination, FeatureStoreRelationship } from './global';

export type FileFormat = {
  parquetFormat?: Record<string, unknown>;
  jsonFormat?: {
    schemaJson?: string;
  };
};

export type FileOptions = {
  fileFormat?: FileFormat;
  uri?: string;
};

export type KafkaOptions = {
  kafkaBootstrapServers: string;
  topic: string;
  messageFormat: {
    jsonFormat: {
      schemaJson: string;
    };
  };
  watermarkDelayThreshold: string;
};

export type RequestDataOptions = {
  schema: Array<{
    name: string;
    valueType: string;
    tags?: Record<string, string>;
    description?: string;
  }>;
};

export type BatchSource = {
  type: string;
  timestampField?: string;
  createdTimestampColumn?: string;
  fileOptions?: FileOptions;
  name: string;
  description?: string;
  tags?: Record<string, string>;
  owner?: string;
  meta: {
    createdTimestamp: string;
    lastUpdatedTimestamp: string;
  };
};

export type DataSource = {
  type: 'BATCH_FILE' | 'REQUEST_SOURCE' | 'STREAM_KAFKA' | 'PUSH_SOURCE';
  timestampField?: string;
  createdTimestampColumn?: string;
  fileOptions?: FileOptions;
  kafkaOptions?: KafkaOptions;
  requestDataOptions?: RequestDataOptions;
  batchSource?: BatchSource;
  name: string;
  description?: string;
  tags?: Record<string, string>;
  owner?: string;
  meta: {
    createdTimestamp: string;
    lastUpdatedTimestamp: string;
  };
  project?: string;
  featureDefinition?: string;
};

export type DataSourceList = {
  dataSources: DataSource[];
  pagination: FeatureStorePagination;
  relationships?: Record<string, FeatureStoreRelationship[]>;
};

export type GetDataSources = (opts: K8sAPIOptions, project?: string) => Promise<DataSourceList>;
export type GetDataSourceByName = (
  opts: K8sAPIOptions,
  project: string,
  dataSourceName: string,
) => Promise<DataSource>;
