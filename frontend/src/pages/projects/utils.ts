import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { bytesAsPreciseGiB } from '#~/utilities/number';
import { convertToUnit, formatMemory, MEMORY_UNITS_FOR_PARSING } from '#~/utilities/valueUnits';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { NotebookState } from './notebook/types';

export const getNotebookStatusPriority = (notebookState: NotebookState): number =>
  notebookState.isRunning ? 1 : notebookState.isStarting ? 2 : 3;

export const getPvcTotalSize = (pvc: PersistentVolumeClaimKind): string =>
  formatMemory(pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage);

export const getPvcRequestSize = (pvc: PersistentVolumeClaimKind): string =>
  formatMemory(pvc.spec.resources.requests.storage);

export const getPvcPercentageUsed = (
  pvc: PersistentVolumeClaimKind,
  inUseInBytes: number,
): number => {
  if (Number.isNaN(inUseInBytes)) {
    return NaN;
  }

  const rawTotalSize = pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage;
  const [totalSizeInGiB] = convertToUnit(rawTotalSize, MEMORY_UNITS_FOR_PARSING, 'Gi');

  if (totalSizeInGiB <= 0) {
    return NaN;
  }

  return Number(((bytesAsPreciseGiB(inUseInBytes) / totalSizeInGiB) * 100).toFixed(2));
};

export const getPvcAccessMode = (pvc: PersistentVolumeClaimKind): AccessMode =>
  pvc.spec.accessModes[0];
