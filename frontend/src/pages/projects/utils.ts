import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { NotebookState } from './notebook/types';

export const getNotebookStatusPriority = (notebookState: NotebookState): number =>
  notebookState.isRunning ? 1 : notebookState.isStarting ? 2 : 3;

export const getPvcTotalSize = (pvc: PersistentVolumeClaimKind): string =>
  pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage;
