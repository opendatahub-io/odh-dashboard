export const ODH_TRUSTED_BUNDLE = 'odh-trusted-ca-bundle';
export const CA_BUNDLE_CRT = 'ca-bundle.crt';
export const ODH_CA_BUNDLE_CRT = 'odh-ca-bundle.crt';

export const DEFAULT_MYSQL_PORT = '3306';
export const DEFAULT_POSTGRES_PORT = '5432';
export const DEFAULT_DATABASE_NAME = 'model-registry';

export enum DatabaseSource {
  DEFAULT = 'default',
  EXTERNAL = 'external',
}

export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRES = 'postgres',
}

export enum SecureDBRType {
  CLUSTER_WIDE = 'cluster-wide',
  OPENSHIFT = 'openshift',
  EXISTING = 'existing',
  NEW = 'new',
}

export enum ResourceType {
  ConfigMap = 'ConfigMap',
  Secret = 'Secret',
}
