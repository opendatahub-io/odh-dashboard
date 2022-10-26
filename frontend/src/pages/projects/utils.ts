import {
  K8sDSGResource,
  NotebookKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
} from '../../k8sTypes';

const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';

export const getProjectDisplayName = (project: ProjectKind): string =>
  getDisplayNameFromK8sResource(project);
export const getProjectDescription = (project: ProjectKind): string =>
  getDescriptionFromK8sResource(project);
export const getProjectCreationTime = (project: ProjectKind): number =>
  project.metadata.creationTimestamp ? new Date(project.metadata.creationTimestamp).getTime() : 0;

export const getNotebookDisplayName = (notebook: NotebookKind): string =>
  getDisplayNameFromK8sResource(notebook);
export const getNotebookDescription = (notebook: NotebookKind): string =>
  getDescriptionFromK8sResource(notebook);

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
