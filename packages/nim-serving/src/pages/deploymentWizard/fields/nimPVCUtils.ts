import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import { isNIMPVC, NIM_PVC_SUBPATH_ANNOTATION } from '../../clusterStorage/clusterStorage';

const MODEL_PATH_ANNOTATION = 'dashboard.opendatahub.io/model-path';

export enum PVCCategory {
  NIM = 'NIM storage',
  GENERAL = 'General purpose',
  MODEL_SERVING = 'Model serving',
}

export type ExistingPVCOption = {
  name: string;
  subPath?: string;
  category: PVCCategory;
};

const isModelServingPVC = (pvc: PersistentVolumeClaimKind): boolean =>
  !!pvc.metadata.annotations?.[MODEL_PATH_ANNOTATION];

const toPVCOption = (pvc: PersistentVolumeClaimKind): ExistingPVCOption => ({
  name: pvc.metadata.name,
  subPath: pvc.metadata.annotations?.[NIM_PVC_SUBPATH_ANNOTATION],
  category: isNIMPVC(pvc)
    ? PVCCategory.NIM
    : isModelServingPVC(pvc)
    ? PVCCategory.MODEL_SERVING
    : PVCCategory.GENERAL,
});

export const categorizePVCs = (pvcs: PersistentVolumeClaimKind[]): ExistingPVCOption[] => {
  const nimPVCs: ExistingPVCOption[] = [];
  const generalPVCs: ExistingPVCOption[] = [];
  const modelServingPVCs: ExistingPVCOption[] = [];

  for (const pvc of pvcs) {
    if (!pvc.metadata.name) {
      continue;
    }
    const option = toPVCOption(pvc);
    if (option.category === PVCCategory.NIM) {
      nimPVCs.push(option);
    } else if (option.category === PVCCategory.MODEL_SERVING) {
      modelServingPVCs.push(option);
    } else {
      generalPVCs.push(option);
    }
  }

  // Order: NIM first, general purpose second, model serving last
  return [...nimPVCs, ...generalPVCs, ...modelServingPVCs];
};
