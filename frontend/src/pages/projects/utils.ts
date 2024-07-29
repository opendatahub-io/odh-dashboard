import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { NotebookSize } from '~/types';
import { NotebookState } from './notebook/types';

export const getNotebookStatusPriority = (notebookState: NotebookState): number =>
  notebookState.isRunning ? 1 : notebookState.isStarting ? 2 : 3;

export const getPvcTotalSize = (pvc: PersistentVolumeClaimKind): string =>
  pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage;

export const getCustomNotebookSize = (
  existingNotebook: NotebookKind | undefined,
): NotebookSize => ({
  name: 'Keep custom size',
  resources: existingNotebook?.spec.template.spec.containers[0].resources ?? {
    limits: {},
    requests: {},
  },
});
