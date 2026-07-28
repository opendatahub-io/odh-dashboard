import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';

export const getModelServingPVCAnnotations = (
  pvc: PersistentVolumeClaimKind,
): { modelName: string | null; modelPath: string | null } => {
  const modelName = pvc.metadata.annotations?.['dashboard.opendatahub.io/model-name'] || null;
  const modelPath = pvc.metadata.annotations?.['dashboard.opendatahub.io/model-path'] || null;

  return { modelName, modelPath };
};
