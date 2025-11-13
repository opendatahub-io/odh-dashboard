import { isValidDate } from '@patternfly/react-core';
import {
  AccessModeSettings,
  MetadataAnnotation,
  StorageClassConfig,
  StorageClassKind,
} from '#~/k8sTypes';
import { AccessMode, StorageProvisioner, provisionerAccessModes } from './storageEnums';

export const getDefaultStorageClassConfig = (
  storageClass: StorageClassKind,
): StorageClassConfig => {
  return {
    displayName: storageClass.metadata.name,
    isEnabled: true,
    isDefault: false,
    lastModified: new Date().toISOString(),
    accessModeSettings: {
      [AccessMode.RWO]: true,
    },
  };
};

export const getStorageClassConfig = (
  storageClass: StorageClassKind,
): StorageClassConfig | undefined => {
  try {
    const storageClassConfig: StorageClassConfig | undefined = JSON.parse(
      storageClass.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig] || '',
    );
    return storageClassConfig;
  } catch {
    return getDefaultStorageClassConfig(storageClass);
  }
};

const setDefaultStorageClassHelper = (
  storageClasses: StorageClassKind[],
  condition: (sc: StorageClassKind) => boolean,
  traverseWholeArray: boolean,
): StorageClassKind[] => {
  let isDefaultSet = false;
  return storageClasses.map((sc) => {
    if (condition(sc) && !isDefaultSet) {
      isDefaultSet = true;
      if (
        getStorageClassConfig(sc)?.isEnabled === false ||
        getStorageClassConfig(sc)?.isDefault === false
      ) {
        return {
          ...sc,
          metadata: {
            ...sc.metadata,
            annotations: {
              ...sc.metadata.annotations,
              [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
                ...getStorageClassConfig(sc),
                isEnabled: true,
                isDefault: true,
              }),
            },
          },
        };
      }
      return sc;
    }
    if (traverseWholeArray && condition(sc)) {
      return {
        ...sc,
        metadata: {
          ...sc.metadata,
          annotations: {
            ...sc.metadata.annotations,
            [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
              ...getStorageClassConfig(sc),
              isDefault: false,
            }),
          },
        },
      };
    }
    return sc;
  });
};

export const setDefaultStorageClass = (storageClasses: StorageClassKind[]): StorageClassKind[] => {
  if (storageClasses.length === 0) {
    return storageClasses;
  }

  const defaultStorageClasses = storageClasses.filter(
    (sc) => getStorageClassConfig(sc)?.isDefault === true,
  );

  if (defaultStorageClasses.length > 0) {
    return setDefaultStorageClassHelper(
      storageClasses,
      (sc) => getStorageClassConfig(sc)?.isDefault === true,
      defaultStorageClasses.length > 1,
    );
  }

  const hasOpenshiftDefaultStorageClass = storageClasses.some((x) =>
    isOpenshiftDefaultStorageClass(x),
  );

  if (hasOpenshiftDefaultStorageClass) {
    return setDefaultStorageClassHelper(
      storageClasses,
      (sc) => isOpenshiftDefaultStorageClass(sc),
      false,
    );
  }

  const firstStorageClass = {
    ...storageClasses[0],
    metadata: {
      ...storageClasses[0].metadata,
      annotations: {
        ...storageClasses[0].metadata.annotations,
        [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
          ...getStorageClassConfig(storageClasses[0]),
          isDefault: true,
          isEnabled: true,
        }),
      },
    },
  };
  return [firstStorageClass, ...storageClasses.slice(1)];
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
