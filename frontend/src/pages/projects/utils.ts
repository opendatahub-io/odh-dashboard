import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { NotebookSize } from '~/types';
import { NotebookState } from './notebook/types';
import { formatMemory } from '~/utilities/valueUnits';

export const getNotebookStatusPriority = (notebookState: NotebookState): number =>
  notebookState.isRunning ? 1 : notebookState.isStarting ? 2 : 3;

export const getPvcTotalSize = (pvc: PersistentVolumeClaimKind): string => {
  const storage =
    formatMemory(pvc.status?.capacity?.storage) ||
    formatMemory(pvc.spec.resources.requests.storage) ||
    '';
  return storage;
};

export const getCustomNotebookSize = (
  existingNotebook: NotebookKind | undefined,
): NotebookSize => ({
  name: 'Keep custom size',
  resources: existingNotebook?.spec.template.spec.containers[0].resources ?? {
    limits: {},
    requests: {},
  },
});
