import { isValidDate } from '@patternfly/react-core';
import { MetadataAnnotation, StorageClassConfig, StorageClassKind } from '~/k8sTypes';
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

export const isOpenshiftDefaultStorageClass = (
  storageClass: StorageClassKind | undefined,
): boolean =>
  storageClass?.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true';

export const isValidConfigValue = (
  configKey: keyof StorageClassConfig,
  value: string | boolean | undefined,
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
    default:
      return false;
  }
};

// Create a Set of StorageProvisioner values for efficient lookup in the type guard
const storageProvisionerValuesSet = new Set<string>(Object.values(StorageProvisioner));

// Type guard to check if a string is a valid StorageProvisioner enum key
const isStorageProvisioner = (value: string): value is StorageProvisioner =>
  storageProvisionerValuesSet.has(value);

export const getSupportedAccessModesForProvisioner = (
  provisionerParameter: StorageProvisioner | string,
): AccessMode[] => {
  const provisionerString = String(provisionerParameter);
  if (isStorageProvisioner(provisionerString)) {
    // Here, provisionerString is confirmed to be of type StorageProvisioner (which is a string enum value)
    // and a valid key for provisionerAccessModes.
    return provisionerAccessModes[provisionerString];
  }

  // If it's a provisioner not in the StorageProvisioner enum then return RWO
  return [AccessMode.RWO];
};

export const getDefaultAccessModeSettings = (
  supportedAccessModes: AccessMode[],
): Partial<Record<AccessMode, boolean>> => {
  const initialSettings: Partial<Record<AccessMode, boolean>> = {};
  return supportedAccessModes.reduce((currentSettings, mode) => {
    // AccessMode.ROW should be set to true, and all other supported access modes should be set to false
    const newSetting = mode === AccessMode.RWO;
    return {
      ...currentSettings,
      [mode]: newSetting,
    };
  }, initialSettings);
};
