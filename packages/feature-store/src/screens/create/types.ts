import { FeastServices, FeastProjectDir, FeastAuthzConfig, FeastCronJob } from '../../k8sTypes';

export enum RegistryType {
  LOCAL = 'local',
  REMOTE = 'remote',
}

export enum PersistenceType {
  FILE = 'file',
  DB = 'store',
}

export enum RemoteRegistryType {
  HOSTNAME = 'hostname',
  FEAST_REF = 'feastRef',
}

export enum AuthzType {
  NONE = 'none',
  KUBERNETES = 'kubernetes',
  OIDC = 'oidc',
}

export enum ProjectDirType {
  NONE = 'none',
  INIT = 'init',
  GIT = 'git',
}

export enum ScalingMode {
  STATIC = 'static',
  HPA = 'hpa',
}

export type FeatureStoreFormData = {
  feastProject: string;
  namespace: string;
  projectDirType: ProjectDirType;
  feastProjectDir?: FeastProjectDir;

  registryType: RegistryType;
  services?: FeastServices;

  authzType: AuthzType;
  authz?: FeastAuthzConfig;

  cronJob?: FeastCronJob;
  replicas: number;

  offlinePersistenceType: PersistenceType;
  onlinePersistenceType: PersistenceType;
  registryPersistenceType: PersistenceType;

  remoteRegistryType: RemoteRegistryType;

  offlineStoreEnabled: boolean;

  registrySecretName: string;
  onlineStoreSecretName: string;
  offlineStoreSecretName: string;

  scalingEnabled: boolean;
  scalingMode: ScalingMode;
  hpaMinReplicas: number;
  hpaMaxReplicas: number;

  batchEngineEnabled: boolean;
  batchEngineConfigMapName: string;
  batchEngineConfigMapKey: string;

  gitSecretName: string;
};

export const FEAST_PROJECT_NAME_REGEX = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

export const VALID_OFFLINE_FILE_TYPES = ['file', 'dask', 'duckdb'];
export const VALID_OFFLINE_DB_TYPES = [
  'snowflake.offline',
  'bigquery',
  'redshift',
  'spark',
  'postgres',
  'trino',
  'athena',
  'mssql',
  'couchbase.offline',
  'clickhouse',
  'ray',
  'oracle',
];

export const VALID_ONLINE_DB_TYPES = [
  'snowflake.online',
  'redis',
  'datastore',
  'dynamodb',
  'bigtable',
  'postgres',
  'cassandra',
  'mysql',
  'hazelcast',
  'singlestore',
  'hbase',
  'elasticsearch',
  'qdrant',
  'couchbase.online',
  'milvus',
  'hybrid',
  'mongodb',
];

export const VALID_REGISTRY_DB_TYPES = ['sql', 'snowflake.registry'];

export const VALID_INIT_TEMPLATES = [
  'local',
  'gcp',
  'aws',
  'snowflake',
  'spark',
  'postgres',
  'hbase',
  'cassandra',
  'hazelcast',
  'couchbase',
  'clickhouse',
];

export const VALID_LOG_LEVELS = ['debug', 'info', 'warning', 'error', 'critical'];

export const VALID_CONCURRENCY_POLICIES = ['Allow', 'Forbid', 'Replace'];
