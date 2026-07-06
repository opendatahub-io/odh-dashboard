import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import { StorageClassKind } from '#~/k8sTypes';

export type StorageTableData = {
  pvc: PersistentVolumeClaimKind;
  storageClass: StorageClassKind | undefined;
};
