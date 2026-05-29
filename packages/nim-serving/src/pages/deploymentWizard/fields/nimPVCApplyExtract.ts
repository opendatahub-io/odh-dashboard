import type { NIMDeployment } from '../../../api/nimservices/types';
import { NIMPVCStorageMode, type NIMPVCFieldValue } from './NIMPVCField';

export const applyNIMPVCFieldData = (
  deployment: NIMDeployment,
  fieldData: NIMPVCFieldValue,
): NIMDeployment => ({
  ...deployment,
  model: {
    ...deployment.model,
    spec: {
      ...deployment.model.spec,
      storage: {
        pvc: {
          name: fieldData.pvcName,
          subPath: fieldData.subPath || undefined,
          ...(fieldData.storageMode === NIMPVCStorageMode.NEW && {
            create: true,
            size: `${fieldData.storageSizeGi}Gi`,
            storageClassName: fieldData.storageClassName || undefined,
          }),
        },
      },
    },
  },
});

export const extractNIMPVCFieldData = (
  deployment: NIMDeployment,
): NIMPVCFieldValue | undefined => {
  const pvc = deployment.model.spec.storage?.pvc;
  if (!pvc?.name) {
    return undefined;
  }
  return {
    storageMode: pvc.create ? NIMPVCStorageMode.NEW : NIMPVCStorageMode.EXISTING,
    pvcName: pvc.name,
    modelPath: '/model-store',
    subPath: pvc.subPath ?? '/',
    storageClassName: pvc.storageClassName ?? '',
    storageSizeGi: pvc.size ? parseInt(pvc.size, 10) : 50,
  };
};
