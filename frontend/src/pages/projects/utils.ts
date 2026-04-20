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

/**
 * Returns the effective capacity in GiB for percentage calculations.
 *
 * For block storage, kubelet reports per-volume metrics so the PVC capacity
 * is the correct denominator. For shared storage (NFS, CephFS, etc.), kubelet
 * reports the entire filesystem and used bytes can exceed the PVC capacity.
 * In that case we fall back to the Prometheus-reported capacity which
 * represents the real filesystem size visible to the pod.
 */
export const getEffectiveCapacityGiB = (
  pvc: PersistentVolumeClaimKind,
  prometheusCapacityBytes: number,
): number => {
  const rawTotalSize = pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage;
  if (!rawTotalSize) {
    return NaN;
  }
  const [pvcCapacityGiB] = convertToUnit(rawTotalSize, MEMORY_UNITS_FOR_PARSING, 'Gi');

  if (!Number.isNaN(prometheusCapacityBytes) && prometheusCapacityBytes > 0) {
    const promCapacityGiB = bytesAsPreciseGiB(prometheusCapacityBytes);
    if (promCapacityGiB > pvcCapacityGiB) {
      return promCapacityGiB;
    }
  }

  return pvcCapacityGiB;
};

export const getPvcPercentageUsed = (
  pvc: PersistentVolumeClaimKind,
  inUseInBytes: number,
  prometheusCapacityBytes?: number,
): number => {
  if (Number.isNaN(inUseInBytes)) {
    return NaN;
  }

  const capacityGiB = getEffectiveCapacityGiB(pvc, prometheusCapacityBytes ?? NaN);

  if (Number.isNaN(capacityGiB) || capacityGiB <= 0) {
    return NaN;
  }

  return Number(((bytesAsPreciseGiB(inUseInBytes) / capacityGiB) * 100).toFixed(2));
};

export const getPvcAccessMode = (pvc: PersistentVolumeClaimKind): AccessMode =>
  pvc.spec.accessModes[0];
