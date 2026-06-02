import { NIMPVCStorageMode, type NIMPVCFieldValue } from './NIMPVCField';
import type { NIMDeployment } from '../../../api/nimservices/types';

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
        },
      },
    },
  },
});

export const extractNIMPVCFieldData = (deployment: NIMDeployment): NIMPVCFieldValue | undefined => {
  const pvc = deployment.model.spec.storage?.pvc;
  if (!pvc?.name) {
    return undefined;
  }
  return {
    storageMode: NIMPVCStorageMode.EXISTING,
    pvcName: pvc.name,
    subPath: pvc.subPath ?? '/',
    storageClassName: pvc.storageClassName ?? '',
    storageSizeGi: pvc.size ? parseInt(pvc.size, 10) : 50,
  };
};
