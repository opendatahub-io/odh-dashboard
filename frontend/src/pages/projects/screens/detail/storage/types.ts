import { PersistentVolumeClaimKind, StorageClassKind } from '#~/k8sTypes';

export type StorageTableData = {
  pvc: PersistentVolumeClaimKind;
  storageClass: StorageClassKind | undefined;
};
