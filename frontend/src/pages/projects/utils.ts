import * as React from 'react';
import {
  K8sDSGResource,
  NotebookKind,
  PersistentVolumeClaimKind,
  ProjectKind,
} from '../../k8sTypes';
import { DEFAULT_PVC_SIZE } from './const';
import { ProjectDetailsContext } from './ProjectDetailsContext';
import { CreatingStorageObject, ExistingStorageObject, UpdateObjectAtPropAndValue } from './types';
import useGenericObjectState from './useGenericObjectState';

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

export const useCreatingStorageObject = (): [
  CreatingStorageObject,
  UpdateObjectAtPropAndValue<CreatingStorageObject>,
] => {
  return useGenericObjectState<CreatingStorageObject>({
    name: '',
    description: '',
    size: DEFAULT_PVC_SIZE,
    workspaceSelections: [],
  });
};

export const useExistingStorageObject = (): [
  ExistingStorageObject,
  UpdateObjectAtPropAndValue<ExistingStorageObject>,
] => {
  return useGenericObjectState<ExistingStorageObject>({
    project: undefined,
    storage: undefined,
  });
};

export const getPvcDisplayName = (pvc: PersistentVolumeClaimKind): string =>
  getDisplayNameFromK8sResource(pvc);
