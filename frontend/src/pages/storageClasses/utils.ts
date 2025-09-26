import { isValidDate } from '@patternfly/react-core';
import {
  AccessModeSettings,
  MetadataAnnotation,
  StorageClassConfig,
  StorageClassKind,
} from '#~/k8sTypes';
import { AccessMode, StorageProvisioner, provisionerAccessModes } from './storageEnums';

export const getStorageClassConfig = (
  storageClass: StorageClassKind,
): StorageClassConfig | undefined => {
  try {
    const storageClassConfig: StorageClassConfig | undefined = JSON.parse(
      storageClass.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig] || '',
    );
    return storageClassConfig;
  } catch {
    return undefined;
  }
};

export const getPossibleStorageClassAccessModes = (
  storageClass?: StorageClassKind | null,
): {
  selectedStorageClassConfig?: StorageClassConfig;
  adminSupportedAccessModes: AccessMode[];
} => {
  const selectedStorageClassConfig = storageClass ? getStorageClassConfig(storageClass) : undefined;

  // RWO is always supported
  const adminSupportedAccessModes = Object.values(AccessMode).filter(
    (mode) =>
      selectedStorageClassConfig?.accessModeSettings?.[mode] === true || mode === AccessMode.RWO,
  );
  return { selectedStorageClassConfig, adminSupportedAccessModes };
};

export const isOpenshiftDefaultStorageClass = (
  storageClass: StorageClassKind | undefined,
): boolean =>
  storageClass?.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true';

export const isValidConfigValue = (
  configKey: keyof StorageClassConfig,
  value: string | boolean | undefined | AccessModeSettings | null,
): boolean => {
  switch (configKey) {
    case 'displayName':
    case 'description':
      return !!value && typeof value === 'string';
    case 'isEnabled':
    case 'isDefault':
      return typeof value === 'boolean';
    case 'lastModified':
      return typeof value === 'string' && isValidDate(new Date(value));
    case 'accessModeSettings':
      return typeof value === 'object' && value !== null;
    default:
      return false;
  }
};

export const isValidAccessModeSettings = (
  value: string | boolean | undefined | AccessModeSettings | null,
): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.values(value).every((v) => typeof v === 'boolean');
};

// Create a Set of StorageProvisioner values for efficient lookup in the type guard
const storageProvisionerValuesSet = new Set<string>(Object.values(StorageProvisioner));

// Type guard to check if a string is a valid StorageProvisioner enum key
const isStorageProvisioner = (value: string): value is StorageProvisioner =>
  storageProvisionerValuesSet.has(value);

export const getSupportedAccessModesForProvisioner = (
  provisionerParameter?: StorageProvisioner | string,
): AccessMode[] | null => {
  if (!provisionerParameter) {
    return [];
  }

  const provisionerString = String(provisionerParameter);
  if (isStorageProvisioner(provisionerString)) {
    // Here, provisionerString is confirmed to be of type StorageProvisioner (which is a string enum value)
    // and a valid key for provisionerAccessModes.
    return provisionerAccessModes[provisionerString];
  }

  // If it's a provisioner not in the StorageProvisioner enum then we cannot recommend
  return null;
};

export const getStorageClassDefaultAccessModeSettings = (): AccessModeSettings => {
  return {
    [AccessMode.RWO]: true,
  };
};
