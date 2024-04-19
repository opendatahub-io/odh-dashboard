import { NotebookKind, PersistentVolumeClaimKind, SecretKind } from '~/k8sTypes';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { NotebookState } from './notebook/types';

export const getNotebookDisplayName = (notebook: NotebookKind): string =>
  getDisplayNameFromK8sResource(notebook);
export const getNotebookDescription = (notebook: NotebookKind): string =>
  getDescriptionFromK8sResource(notebook);
export const getNotebookStatusPriority = (notebookState: NotebookState): number =>
  notebookState.isRunning ? 1 : notebookState.isStarting ? 2 : 3;

export const getPvcDisplayName = (pvc: PersistentVolumeClaimKind): string =>
  getDisplayNameFromK8sResource(pvc);
export const getPvcDescription = (pvc: PersistentVolumeClaimKind): string =>
  getDescriptionFromK8sResource(pvc);
export const getPvcTotalSize = (pvc: PersistentVolumeClaimKind): string =>
  pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage;

export const getSecretDisplayName = (secret: SecretKind): string =>
  getDisplayNameFromK8sResource(secret);
export const getSecretDescription = (secret: SecretKind): string =>
  getDescriptionFromK8sResource(secret);
