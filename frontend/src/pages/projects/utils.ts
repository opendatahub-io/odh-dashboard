import {
  AWSSecretKind,
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
const getRelatedNotebooksFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['opendatahub.io/related-notebooks'] || '';

export const getProjectDisplayName = (project: ProjectKind): string =>
  getDisplayNameFromK8sResource(project);
export const getProjectDescription = (project: ProjectKind): string =>
  getDescriptionFromK8sResource(project);

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
export const getPvcRelatedNotebooks = (pvc: PersistentVolumeClaimKind): string =>
  getRelatedNotebooksFromK8sResource(pvc);

export const getSecretDisplayName = (secret: SecretKind): string =>
  getDisplayNameFromK8sResource(secret);
export const getSecretDescription = (secret: SecretKind): string =>
  getDescriptionFromK8sResource(secret);
export const getAWSSecretRelatedNotebooks = (secret: AWSSecretKind): string =>
  getRelatedNotebooksFromK8sResource(secret);
