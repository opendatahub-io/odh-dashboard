import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStorePagination, FeatureStoreRelationship } from './global';

export type DataSetFileStorage = {
  fileStorage: {
    fileFormat: {
      parquetFormat: Record<string, never>;
    };
    uri: string;
  };
};

export type DataSetBigQueryStorage = {
  bigqueryStorage: {
    table: string;
  };
};

export type DataSetRedshiftStorage = {
  redshiftStorage: {
    table: string;
    schema: string;
    database: string;
  };
};
export type DataSetSnowflakeStorage = {
  snowflakeStorage: {
    table: string;
    schema: string;
    database: string;
  };
};
export type DataSetTrinoStorage = {
  trinoStorage: {
    table: string;
  };
};
export type DataSetSparkStorage = {
  sparkStorage: {
    path: string;
    fileFormat: string;
    table: string;
  };
};
export type DataSetAthenaStorage = {
  athenaStorage: {
    table: string;
    database: string;
    dataSource: string;
  };
};
export type DataSetCustomStorage = {
  customStorage: {
    configuration: string;
  };
};

export type DataSetStorage =
  | DataSetFileStorage
  | DataSetBigQueryStorage
  | DataSetRedshiftStorage
  | DataSetSnowflakeStorage
  | DataSetTrinoStorage
  | DataSetSparkStorage
  | DataSetAthenaStorage
  | DataSetCustomStorage;

export type DataSet = {
  spec: {
    description: string;
    name: string;
    features: string[];
    joinKeys: string[];
    storage: DataSetStorage;
    tags?: Record<string, string>;
    featureServiceName?: string;
  };
  meta: {
    createdTimestamp?: string;
    lastUpdatedTimestamp?: string;
    maxEventTimestamp: string;
    minEventTimestamp: string;
  };
  project?: string;
  featureDefinition?: string;
};

export type DataSetList = {
  savedDatasets: DataSet[];
  pagination: FeatureStorePagination;
  relationships: Record<string, FeatureStoreRelationship[]>;
};

export type GetDataSets = (opts: K8sAPIOptions, project?: string) => Promise<DataSetList>;
export type GetSavedDatasets = (opts: K8sAPIOptions, project?: string) => Promise<DataSetList>;
export type GetDataSetByName = (
  opts: K8sAPIOptions,
  project: string,
  dataSetName: string,
) => Promise<DataSet>;
export type Tags = Record<string, string>;
