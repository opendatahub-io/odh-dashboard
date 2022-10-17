import * as React from 'react';
import {
  K8sDSGResource,
  NotebookKind,
  PersistentVolumeClaimKind,
  ProjectKind,
} from '../../k8sTypes';
import { ProjectDetailsContext } from './ProjectDetailsContext';

const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';

export const getProjectDisplayName = (project: ProjectKind): string =>
  getDisplayNameFromK8sResource(project);

export const getProjectDescription = (project: ProjectKind): string =>
  getDescriptionFromK8sResource(project);

export const useCurrentProjectDisplayName = (): string => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  return getProjectDisplayName(currentProject);
};

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
