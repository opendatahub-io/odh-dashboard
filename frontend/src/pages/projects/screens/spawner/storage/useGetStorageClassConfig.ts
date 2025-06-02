import { StorageClassKind, StorageClassConfig } from '#~/k8sTypes';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import {
  getAccessModeSettings,
  getStorageClassConfig,
  getSupportedAccessModesForProvisioner,
} from '#~/pages/storageClasses/utils';
import { AccessMode } from '#~/pages/storageClasses/storageEnums.js';

export const useGetStorageClassConfig = (
  storageClassName?: string,
): {
  storageClasses: StorageClassKind[];
  storageClassesLoaded: boolean;
  selectedStorageClassConfig?: StorageClassConfig;
  openshiftSupportedAccessModes: AccessMode[];
  adminSupportedAccessModes: AccessMode[];
} => {
  const [storageClasses, storageClassesLoaded] = useStorageClasses();
  const selectedStorageClass = storageClasses.find((sc) => sc.metadata.name === storageClassName);

  const openshiftSupportedAccessModes = getSupportedAccessModesForProvisioner(
    selectedStorageClass?.provisioner,
  );

  const selectedStorageClassConfig = selectedStorageClass
    ? getStorageClassConfig(selectedStorageClass)
    : undefined;

  const adminSupportedAccessModes = getAccessModeSettings(
    openshiftSupportedAccessModes,
    selectedStorageClassConfig?.accessModeSettings,
  );

  return {
    storageClasses,
    storageClassesLoaded,
    selectedStorageClassConfig,
    openshiftSupportedAccessModes,
    adminSupportedAccessModes,
  };
};
