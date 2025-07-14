import { StorageClassKind, StorageClassConfig } from '#~/k8sTypes';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import { getPossibleStorageClassAccessModes } from '#~/pages/storageClasses/utils';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';

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

  const { selectedStorageClassConfig, openshiftSupportedAccessModes, adminSupportedAccessModes } =
    getPossibleStorageClassAccessModes(selectedStorageClass);

  return {
    storageClasses,
    storageClassesLoaded,
    selectedStorageClassConfig,
    openshiftSupportedAccessModes,
    adminSupportedAccessModes,
  };
};
