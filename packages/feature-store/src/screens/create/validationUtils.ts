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
import { FeastPvcConfig } from '../../k8sTypes';

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
        'Name must consist of lowercase alphanumeric characters, hyphens, or dots, ' +
        'and must start and end with an alphanumeric character.',
    };
  }
  if (existingProjectNames.includes(data.feastProject)) {
    return { valid: false, message: 'A feature store with this name already exists.' };
  }
  if (!data.namespace.trim()) {
    return { valid: false, message: 'Namespace is required.' };
  }
  if (data.projectDirType === ProjectDirType.GIT) {
    if (!data.feastProjectDir?.git?.url.trim()) {
      return { valid: false, message: 'Git repository URL is required.' };
    }
    if (data.feastProjectDir.git.featureRepoPath?.startsWith('/')) {
      return { valid: false, message: 'Feature repo path must not start with a slash.' };
    }
  }
  return { valid: true };
};

const validatePvc = (pvc: FeastPvcConfig | undefined, label: string): ValidationResult | null => {
  if (!pvc) {
    return null;
  }
  if (pvc.ref && !pvc.ref.name.trim()) {
    return { valid: false, message: `${label} PVC name is required.` };
  }
  if ((pvc.ref || pvc.create) && !pvc.mountPath.trim()) {
    return { valid: false, message: `${label} mount path is required.` };
  }
  return null;
};

const validateRegistry = (data: FeatureStoreFormData): ValidationResult => {
  if (data.registryType === RegistryType.LOCAL) {
    const localRegistry = data.services?.registry?.local;
    const server = localRegistry?.server;
    if (server?.restAPI !== true) {
      return {
        valid: false,
        message:
          'REST API must be enabled for the registry server. The Feature Store UI requires it.',
      };
    }
    if (data.registryPersistenceType === PersistenceType.DB) {
      const store = localRegistry?.persistence?.store;
      if (!store?.type) {
        return { valid: false, message: 'Registry DB store type is required.' };
      }
      if (!store.secretRef?.name.trim()) {
        return { valid: false, message: 'Registry DB store secret reference is required.' };
      }
    } else {
      const pvcError = validatePvc(localRegistry?.persistence?.file?.pvc, 'Registry');
      if (pvcError) {
        return pvcError;
      }
    }
  } else if (data.remoteRegistryType === RemoteRegistryType.HOSTNAME) {
    const hostname = data.services?.registry?.remote?.hostname;
    if (!hostname?.trim()) {
      return { valid: false, message: 'Remote registry hostname is required.' };
    }
    const tls = data.services?.registry?.remote?.tls;
    if (tls) {
      if (!tls.configMapRef.name.trim()) {
        return { valid: false, message: 'TLS CA certificate ConfigMap is required.' };
      }
      if (!tls.certName.trim()) {
        return { valid: false, message: 'TLS certificate key name is required.' };
      }
    }
  } else {
    const feastRef = data.services?.registry?.remote?.feastRef;
    if (!feastRef?.name.trim()) {
      return {
        valid: false,
        message: 'Feature store reference name is required for remote registry.',
      };
    }
  }
  return { valid: true };
};

const validateStoreConfig = (data: FeatureStoreFormData): ValidationResult => {
  const onlineStore = data.services?.onlineStore;
  if (data.onlinePersistenceType === PersistenceType.DB) {
    const store = onlineStore?.persistence?.store;
    if (!store?.type) {
      return { valid: false, message: 'Online store DB type is required.' };
    }
    if (!store.secretRef.name.trim()) {
      return { valid: false, message: 'Online store DB secret reference is required.' };
    }
  } else {
    const pvcError = validatePvc(onlineStore?.persistence?.file?.pvc, 'Online store');
    if (pvcError) {
      return pvcError;
    }
  }

  if (data.offlineStoreEnabled) {
    const offlineStore = data.services?.offlineStore;
    if (data.offlinePersistenceType === PersistenceType.DB) {
      const store = offlineStore?.persistence?.store;
      if (!store?.type) {
        return { valid: false, message: 'Offline store DB type is required.' };
      }
      if (!store.secretRef.name.trim()) {
        return { valid: false, message: 'Offline store DB secret reference is required.' };
      }
    } else {
      const pvcError = validatePvc(offlineStore?.persistence?.file?.pvc, 'Offline store');
      if (pvcError) {
        return pvcError;
      }
    }
  }

  return { valid: true };
};

const isMultiReplica = (data: FeatureStoreFormData): boolean =>
  (data.scalingMode === ScalingMode.STATIC && data.replicas > 1) ||
  (data.scalingMode === ScalingMode.HPA && data.hpaMaxReplicas > 1);

const hasScalableRegistry = (data: FeatureStoreFormData): boolean => {
  if (data.registryType !== RegistryType.LOCAL) {
    return true;
  }
  const path = data.services?.registry?.local?.persistence?.file?.path;
  return (
    data.registryPersistenceType === PersistenceType.DB ||
    !!path?.startsWith('s3://') ||
    !!path?.startsWith('gs://')
  );
};

const validateAdvanced = (data: FeatureStoreFormData): ValidationResult => {
  if (data.authzType === AuthzType.OIDC) {
    if (!data.authz?.oidc?.secretRef?.name.trim()) {
      return { valid: false, message: 'OIDC secret reference is required.' };
    }
  }

  if (data.batchEngineEnabled && !data.batchEngineConfigMapName.trim()) {
    return { valid: false, message: 'Batch compute engine ConfigMap is required.' };
  }

  if (data.scalingEnabled) {
    if (data.scalingMode === ScalingMode.HPA) {
      if (data.hpaMaxReplicas < data.hpaMinReplicas) {
        return {
          valid: false,
          message: 'HPA maximum replicas must be >= minimum replicas.',
        };
      }
    }

    if (isMultiReplica(data)) {
      if (data.onlinePersistenceType !== PersistenceType.DB) {
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
      if (!hasScalableRegistry(data)) {
        return {
          valid: false,
          message: 'Scaling requires DB-backed or remote registry, or S3/GCS registry file path.',
        };
      }
    }
  }

  return { valid: true };
};

export const needsMultiReplicaWarning = (data: FeatureStoreFormData): boolean => {
  if (!isMultiReplica(data)) {
    return false;
  }
  if (data.onlinePersistenceType !== PersistenceType.DB) {
    return true;
  }
  if (data.offlineStoreEnabled && data.offlinePersistenceType !== PersistenceType.DB) {
    return true;
  }
  return !hasScalableRegistry(data);
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
