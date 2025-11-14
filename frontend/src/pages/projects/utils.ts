import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { formatMemory } from '#~/utilities/valueUnits';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { NotebookState } from './notebook/types';

export const getNotebookStatusPriority = (notebookState: NotebookState): number =>
  notebookState.isRunning ? 1 : notebookState.isStarting ? 2 : 3;

export const getPvcTotalSize = (pvc: PersistentVolumeClaimKind): string =>
  formatMemory(pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage);

export const getPvcRequestSize = (pvc: PersistentVolumeClaimKind): string =>
  formatMemory(pvc.spec.resources.requests.storage);

export const getPvcAccessMode = (pvc: PersistentVolumeClaimKind): AccessMode =>
  pvc.spec.accessModes[0];
