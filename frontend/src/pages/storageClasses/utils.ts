import { isValidDate } from '@patternfly/react-core';
import { MetadataAnnotation, StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { AccessMode, StorageProvisioner, provisionerAccessModes } from './constants';

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

export const getSupportedAccessModesForProvisioner = (
  provisioner: StorageProvisioner | string,
): AccessMode[] => {
  const modes = provisionerAccessModes[provisioner as StorageProvisioner];
  if (modes) {
    return modes;
  }
  return [];
};

export const getDefaultAccessModeSettings = (
  supportedAccessModes: AccessMode[],
): { [key in AccessMode]?: boolean } => supportedAccessModes.reduce(
  (settings, mode) => {
    if (mode === AccessMode.ROX) {
      // ROX is supported by provisioner, but we default it to false
      settings[mode] = false;
    } else {
      settings[mode] = true; // Default to true if supported and not ROX
    }
    return settings;
  },
  {} as { [key in AccessMode]?: boolean },
);
