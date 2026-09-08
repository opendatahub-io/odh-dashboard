import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';

export const NIM_PVC_ANNOTATION = 'dashboard.opendatahub.io/nim-pvc';
export const NIM_PVC_SUBPATH_ANNOTATION = 'dashboard.opendatahub.io/nim-subpath';

export const isNIMPVC = (pvc: PersistentVolumeClaimKind): boolean =>
  !!pvc.metadata.annotations && Object.hasOwn(pvc.metadata.annotations, NIM_PVC_ANNOTATION);
