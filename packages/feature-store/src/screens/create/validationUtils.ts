import {
  FeatureStoreFormData,
  FEAST_PROJECT_NAME_REGEX,
  RegistryType,
  PersistenceType,
  AuthzType,
  RemoteRegistryType,
  ProjectDirType,
  ScalingMode,
} from './types';

export type ValidationResult = {
  valid: boolean;
  message?: string;
};

export type StepValidation = {
  projectBasics: ValidationResult;
  registry: ValidationResult;
  storeConfig: ValidationResult;
  advanced: ValidationResult;
};

const validateProjectBasics = (
  data: FeatureStoreFormData,
  existingProjectNames: string[],
): ValidationResult => {
  if (!data.feastProject.trim()) {
    return { valid: false, message: 'Name is required.' };
  }
  if (!FEAST_PROJECT_NAME_REGEX.test(data.feastProject)) {
    return {
      valid: false,
      message:
        'Name must consist of lowercase alphanumeric characters, hyphens, or dots, and must start and end with an alphanumeric character.',
    };
  }
  if (existingProjectNames.includes(data.feastProject)) {
    return { valid: false, message: 'A feature store with this name already exists.' };
  }
  if (!data.namespace) {
    return { valid: false, message: 'Namespace is required.' };
  }
  return { valid: true };
};

const validateRegistry = (data: FeatureStoreFormData): ValidationResult => {
  if (data.registryType === RegistryType.LOCAL) {
    const localRegistry = data.services?.registry?.local;
    const server = localRegistry?.server;
    if (server && server.restAPI !== true && server.grpc !== true) {
      return {
        valid: false,
        message: 'At least one of REST API or gRPC must be enabled for the registry server.',
      };
    }
    if (data.registryPersistenceType === PersistenceType.DB) {
      const store = localRegistry?.persistence?.store;
      if (!store?.type) {
        return { valid: false, message: 'Registry DB store type is required.' };
      }
      if (!store.secretRef.name) {
        return { valid: false, message: 'Registry DB store secret reference is required.' };
      }
    }
  } else if (data.remoteRegistryType === RemoteRegistryType.HOSTNAME) {
    const hostname = data.services?.registry?.remote?.hostname;
    if (!hostname?.trim()) {
      return { valid: false, message: 'Remote registry hostname is required.' };
    }
  } else {
    const feastRef = data.services?.registry?.remote?.feastRef;
    if (!feastRef?.name.trim()) {
      return {
        valid: false,
        message: 'FeatureStore reference name is required for remote registry.',
      };
    }
  }
  return { valid: true };
};

const validateStoreConfig = (data: FeatureStoreFormData): ValidationResult => {
  if (data.offlineStoreEnabled && data.offlinePersistenceType === PersistenceType.DB) {
    const store = data.services?.offlineStore?.persistence?.store;
    if (!store?.type) {
      return { valid: false, message: 'Offline store DB type is required.' };
    }
    if (!store.secretRef.name) {
      return { valid: false, message: 'Offline store DB secret reference is required.' };
    }
  }

  if (data.onlineStoreEnabled && data.onlinePersistenceType === PersistenceType.DB) {
    const store = data.services?.onlineStore?.persistence?.store;
    if (!store?.type) {
      return { valid: false, message: 'Online store DB type is required.' };
    }
    if (!store.secretRef.name) {
      return { valid: false, message: 'Online store DB secret reference is required.' };
    }
  }

  return { valid: true };
};

const validateAdvanced = (data: FeatureStoreFormData): ValidationResult => {
  if (data.authzType === AuthzType.OIDC) {
    if (!data.authz?.oidc?.secretRef.name.trim()) {
      return { valid: false, message: 'OIDC secret reference is required.' };
    }
  }

  if (data.projectDirType === ProjectDirType.GIT) {
    if (!data.feastProjectDir?.git?.url.trim()) {
      return { valid: false, message: 'Git repository URL is required.' };
    }
  }

  if (data.scalingEnabled) {
    const needsMultiReplicaValidation =
      (data.scalingMode === ScalingMode.STATIC && data.replicas > 1) ||
      data.scalingMode === ScalingMode.HPA;

    if (data.scalingMode === ScalingMode.HPA) {
      if (data.hpaMaxReplicas < data.hpaMinReplicas) {
        return {
          valid: false,
          message: 'HPA maximum replicas must be >= minimum replicas.',
        };
      }
    }

    if (needsMultiReplicaValidation) {
      if (data.onlinePersistenceType !== PersistenceType.DB && data.onlineStoreEnabled) {
        return {
          valid: false,
          message: 'Scaling requires DB-backed persistence for the online store.',
        };
      }
      if (data.offlineStoreEnabled && data.offlinePersistenceType !== PersistenceType.DB) {
        return {
          valid: false,
          message: 'Scaling requires DB-backed persistence for the offline store.',
        };
      }
      if (data.registryType === RegistryType.LOCAL) {
        const registryPersistence = data.services?.registry?.local?.persistence;
        const hasDBRegistry = data.registryPersistenceType === PersistenceType.DB;
        const hasS3OrGSRegistry =
          registryPersistence?.file?.path?.startsWith('s3://') ||
          registryPersistence?.file?.path?.startsWith('gs://');
        if (!hasDBRegistry && !hasS3OrGSRegistry) {
          return {
            valid: false,
            message: 'Scaling requires DB-backed or remote registry, or S3/GCS registry file path.',
          };
        }
      }
    }
  }

  return { valid: true };
};

export const validateFeatureStoreForm = (
  data: FeatureStoreFormData,
  existingProjectNames: string[],
): StepValidation => ({
  projectBasics: validateProjectBasics(data, existingProjectNames),
  registry: validateRegistry(data),
  storeConfig: validateStoreConfig(data),
  advanced: validateAdvanced(data),
});

export const isFormValid = (validation: StepValidation): boolean =>
  validation.projectBasics.valid &&
  validation.registry.valid &&
  validation.storeConfig.valid &&
  validation.advanced.valid;
