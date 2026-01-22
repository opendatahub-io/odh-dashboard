import { RecursivePartial } from '#~/typeHelpers';
import { ConfigSecretItem, ModelRegistryKind } from '#~/k8sTypes';
import {
  CA_BUNDLE_CRT,
  DatabaseSource,
  DatabaseType,
  ODH_CA_BUNDLE_CRT,
  ODH_TRUSTED_BUNDLE,
  ResourceType,
  SecureDBRType,
} from './const';
import { SecureDBInfo } from './CreateMRSecureDBSection';

export const findSecureDBType = (name: string, key: string): SecureDBRType => {
  if (name === ODH_TRUSTED_BUNDLE && key === CA_BUNDLE_CRT) {
    return SecureDBRType.CLUSTER_WIDE;
  }
  if (name === ODH_TRUSTED_BUNDLE && key === ODH_CA_BUNDLE_CRT) {
    return SecureDBRType.OPENSHIFT;
  }
  return SecureDBRType.EXISTING;
};

export const findConfigMap = (secureDBInfo: SecureDBInfo): { name: string; key: string } => {
  if (secureDBInfo.type === SecureDBRType.CLUSTER_WIDE) {
    return { name: ODH_TRUSTED_BUNDLE, key: CA_BUNDLE_CRT };
  }
  if (secureDBInfo.type === SecureDBRType.OPENSHIFT) {
    return { name: ODH_TRUSTED_BUNDLE, key: ODH_CA_BUNDLE_CRT };
  }
  return { name: secureDBInfo.resourceName, key: secureDBInfo.key };
};

/**
 * Constructs the request body for creating or updating a model registry.
 * Handles SSL certificate configuration (ConfigMap or Secret) based on the secure DB settings.
 *
 * @param data - The model registry data to be sent
 * @param secureDBInfo - Information about the SSL certificate configuration
 * @param addSecureDB - Whether to add SSL certificate configuration
 * @param databaseType - The database type (MySQL or PostgreSQL), defaults to MySQL
 * @returns The modified model registry object with SSL configuration applied
 */
export const constructRequestBody = (
  data: RecursivePartial<ModelRegistryKind>,
  secureDBInfo: SecureDBInfo,
  addSecureDB: boolean,
  databaseType: DatabaseType = DatabaseType.MYSQL,
): RecursivePartial<ModelRegistryKind> => {
  const mr = data;
  const dbSpec = databaseType === DatabaseType.POSTGRES ? mr.spec?.postgres : mr.spec?.mysql;

  // If database spec doesn't exist, return unmodified data
  // This is a defensive check - normally the spec should always exist from buildDatabaseSpec()
  if (!dbSpec) {
    // eslint-disable-next-line no-console
    console.warn('constructRequestBody: Database spec not found, returning unmodified data');
    return mr;
  }

  if (addSecureDB && secureDBInfo.resourceType === ResourceType.Secret) {
    dbSpec.sslRootCertificateSecret = {
      name: secureDBInfo.resourceName,
      key: secureDBInfo.key,
    };
    dbSpec.sslRootCertificateConfigMap = null;
  } else if (addSecureDB) {
    dbSpec.sslRootCertificateConfigMap = findConfigMap(secureDBInfo);
    dbSpec.sslRootCertificateSecret = null;
  } else {
    dbSpec.sslRootCertificateConfigMap = null;
    dbSpec.sslRootCertificateSecret = null;
  }

  return mr;
};

export const isClusterWideCABundleEnabled = (
  existingCertConfigMaps: ConfigSecretItem[],
): boolean => {
  const clusterWideCABundle = existingCertConfigMaps.find(
    (configMap) => configMap.name === ODH_TRUSTED_BUNDLE && configMap.keys.includes(CA_BUNDLE_CRT),
  );
  return !!clusterWideCABundle;
};

export const isOpenshiftCAbundleEnabled = (existingCertConfigMaps: ConfigSecretItem[]): boolean => {
  const openshiftCAbundle = existingCertConfigMaps.find(
    (configMap) =>
      configMap.name === ODH_TRUSTED_BUNDLE && configMap.keys.includes(ODH_CA_BUNDLE_CRT),
  );
  return !!openshiftCAbundle;
};

/**
 * Validates that the port is a numeric integer between 1 and 65535.
 * @param value - The port value to validate
 * @returns true if the port is valid, false otherwise
 */
export const isValidPort = (value: string): boolean => {
  const portNum = Number(value);
  return !Number.isNaN(portNum) && Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
};

/**
 * Builds the database specification object based on the selected database source and type.
 * For Default source: Returns PostgreSQL config with generateDeployment=true
 * For External source: Returns MySQL or PostgreSQL config based on databaseType
 *
 * @param databaseSource - Whether using default or external database
 * @param databaseType - The type of database (MySQL or PostgreSQL)
 * @param config - External database configuration (host, port, database, username)
 * @returns Database specification with either mysql or postgres configuration (and the other set to undefined)
 */
export const buildDatabaseSpec = (
  databaseSource: DatabaseSource,
  databaseType: DatabaseType,
  config?: {
    host: string;
    port: number;
    database: string;
    username: string;
  },
): Pick<ModelRegistryKind['spec'], 'mysql' | 'postgres'> => {
  if (databaseSource === DatabaseSource.DEFAULT) {
    // Default in-cluster PostgreSQL database
    // When using generateDeployment, only that field should be set
    return {
      postgres: {
        generateDeployment: true,
      },
      mysql: undefined,
    };
  }

  // External database configuration
  if (!config) {
    throw new Error(
      'External database configuration is required when using external database source',
    );
  }

  const dbConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    skipDBCreation: false,
  };

  if (databaseType === DatabaseType.POSTGRES) {
    return { postgres: dbConfig, mysql: undefined };
  }
  return { mysql: dbConfig, postgres: undefined };
};
