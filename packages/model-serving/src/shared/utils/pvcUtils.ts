import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';

export const getModelServingPVCAnnotations = (
  pvc: PersistentVolumeClaimKind,
): { modelName: string | null; modelPath: string | null } => {
  const modelName = pvc.metadata.annotations?.['dashboard.opendatahub.io/model-name'] || null;
  const modelPath = pvc.metadata.annotations?.['dashboard.opendatahub.io/model-path'] || null;

  return { modelName, modelPath };
};

export const getPVCNameFromURI = (uri: string): string => {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'pvc:') {
      return '';
    }
    return url.hostname;
  } catch {
    return '';
  }
};

export const isPVCUri = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    return url.protocol === 'pvc:';
  } catch {
    return false;
  }
};

export const getModelPathFromUri = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, '');
  } catch {
    return '';
  }
};
