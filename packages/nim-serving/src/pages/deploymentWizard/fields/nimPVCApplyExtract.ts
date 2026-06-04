import {
  convertToUnit,
  MEMORY_UNITS_FOR_PARSING,
} from '@odh-dashboard/internal/utilities/valueUnits';
import { NIMPVCStorageMode, type NIMPVCFieldValue } from './NIMPVCField';
import type { NIMDeployment } from '../../../api/nimservices/types';

const normalizeSubPath = (subPath: string): string | undefined => {
  const stripped = subPath.replace(/^\/+/, '');
  return stripped || undefined;
};

const DEFAULT_STORAGE_SIZE_GI = 50;

const parseSizeToGi = (size: string): number => {
  const parsed = Number(size);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return Math.round(parsed);
  }
  if (!/^\d/.test(size)) {
    return DEFAULT_STORAGE_SIZE_GI;
  }
  const [value] = convertToUnit(size, MEMORY_UNITS_FOR_PARSING, 'Gi');
  return Math.round(value) || DEFAULT_STORAGE_SIZE_GI;
};

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
          subPath: normalizeSubPath(fieldData.subPath),
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
    subPath: pvc.subPath ?? '',
    storageClassName: pvc.storageClassName ?? '',
    storageSizeGi: pvc.size ? parseSizeToGi(pvc.size) : DEFAULT_STORAGE_SIZE_GI,
  };
};
