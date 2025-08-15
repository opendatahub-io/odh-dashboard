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
  openshiftSupportedAccessModes: AccessMode[];
  adminSupportedAccessModes: AccessMode[];
} => {
  const openshiftSupportedAccessModes = getSupportedAccessModesForProvisioner(
    storageClass?.provisioner,
  );
  const selectedStorageClassConfig = storageClass ? getStorageClassConfig(storageClass) : undefined;

  // RWO is always supported
  const adminSupportedAccessModes: AccessMode[] = [
    AccessMode.RWO,
    ...openshiftSupportedAccessModes.filter(
      (accessMode) =>
        accessMode !== AccessMode.RWO &&
        selectedStorageClassConfig?.accessModeSettings &&
        selectedStorageClassConfig.accessModeSettings[accessMode] === true,
    ),
  ];
  return { selectedStorageClassConfig, openshiftSupportedAccessModes, adminSupportedAccessModes };
};

export const isOpenshiftDefaultStorageClass = (
  storageClass: StorageClassKind | undefined,
): boolean =>
  storageClass?.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true';

export const isValidConfigValue = (
  configKey: keyof StorageClassConfig,
  value: string | boolean | undefined | AccessModeSettings,
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
      return typeof value === 'object';
    default:
      return false;
  }
};

export const isValidAccessModeSettings = (
  storageClass: StorageClassKind,
  value: string | boolean | undefined | AccessModeSettings,
): boolean => {
  if (typeof value !== 'object') {
    return false;
  }

  const supportedAccessModes = getSupportedAccessModesForProvisioner(storageClass.provisioner);

  if (
    !supportedAccessModes.every(
      (mode) => value[mode] === undefined || typeof value[mode] === 'boolean',
    )
  ) {
    return false;
  }

  return true;
};

// Create a Set of StorageProvisioner values for efficient lookup in the type guard
const storageProvisionerValuesSet = new Set<string>(Object.values(StorageProvisioner));

// Type guard to check if a string is a valid StorageProvisioner enum key
const isStorageProvisioner = (value: string): value is StorageProvisioner =>
  storageProvisionerValuesSet.has(value);

export const getSupportedAccessModesForProvisioner = (
  provisionerParameter?: StorageProvisioner | string,
): AccessMode[] => {
  if (!provisionerParameter) {
    return [];
  }

  const provisionerString = String(provisionerParameter);
  if (isStorageProvisioner(provisionerString)) {
    // Here, provisionerString is confirmed to be of type StorageProvisioner (which is a string enum value)
    // and a valid key for provisionerAccessModes.
    return provisionerAccessModes[provisionerString];
  }

  // If it's a provisioner not in the StorageProvisioner enum then return RWO
  return [AccessMode.RWO];
};

export const getAccessModeSettings = (
  supportedAccessModes: AccessMode[],
  accessModeSettings?: AccessModeSettings,
): AccessMode[] => {
  const accessModeSettingsArr = [];
  for (const accessMode of supportedAccessModes) {
    if (accessModeSettings?.[accessMode] === true) {
      accessModeSettingsArr.push(accessMode);
    }
  }
  return accessModeSettingsArr;
};

export const getAdminDefaultAccessModeSettings = (
  supportedAccessModes: AccessMode[],
): AccessModeSettings => {
  const initialSettings: AccessModeSettings = {};
  return supportedAccessModes.reduce((currentSettings, mode) => {
    // AccessMode.RWO should be set to true, and all other supported access modes should be set to false
    const newSetting = mode === AccessMode.RWO;
    return {
      ...currentSettings,
      [mode]: newSetting,
    };
  }, initialSettings);
};

export const getStorageClassDefaultAccessModeSettings = (
  storageClass: StorageClassKind,
): AccessModeSettings => {
  const supportedAccessModesForProvisioner = getSupportedAccessModesForProvisioner(
    storageClass.provisioner,
  );
  return getAdminDefaultAccessModeSettings(supportedAccessModesForProvisioner);
};
