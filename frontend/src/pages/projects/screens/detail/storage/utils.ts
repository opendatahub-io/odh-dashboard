import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { StorageData } from '~/pages/projects/types';

type Status = 'error' | 'warning' | 'info' | null;
export const getFullStatusFromPercentage = (percentageFull: number): Status => {
  if (percentageFull === 100) {
    return 'error';
  }
  if (percentageFull >= 95) {
    return 'warning';
  }
  if (percentageFull >= 90) {
    return 'info';
  }
  return null;
};

export const isPvcUpdateRequired = (
  existingPvc: PersistentVolumeClaimKind,
  storageData: StorageData,
): boolean =>
  getDisplayNameFromK8sResource(existingPvc) !== storageData.name ||
  getDescriptionFromK8sResource(existingPvc) !== storageData.description ||
  existingPvc.spec.resources.requests.storage !== storageData.size ||
  existingPvc.spec.storageClassName !== storageData.storageClassName;
