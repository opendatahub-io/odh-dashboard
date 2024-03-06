import projectImg from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import notebookImg from '~/images/UI_icon-Red_Hat-Wrench-RGB.svg';
import pipelineImg from '~/images/UI_icon-Red_Hat-Branch-RGB.svg';
import pipelineRunImg from '~/images/UI_icon-Red_Hat-Double_arrow_right-RGB.svg';
import clusterStorageImg from '~/images/UI_icon-Red_Hat-Storage-RGB.svg';
import modelServerImg from '~/images/UI_icon-Red_Hat-Server-RGB.svg';
import dataConnectionImg from '~/images/UI_icon-Red_Hat-Connected-RGB.svg';
import userImg from '~/images/UI_icon-Red_Hat-User-RGB.svg';
import groupImg from '~/images/UI_icon-Red_Hat-Shared_workspace-RGB.svg';
import projectEmptyStateImg from '~/images/empty-state-projects-overview.svg';
import notebookEmptyStateImg from '~/images/empty-state-notebooks.svg';
import pipelineEmptyStateImg from '~/images/empty-state-pipelines.svg';
import clusterStorageEmptyStateImg from '~/images/empty-state-cluster-storage.svg';
import modelServerEmptyStateImg from '~/images/empty-state-model-serving.svg';
import dataConnectionEmptyStateImg from '~/images/empty-state-data-connections.svg';

import {
  K8sDSGResource,
  NotebookKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
} from '~/k8sTypes';
import { ProjectObjectType } from '~/pages/projects/types';
import { NotebookState } from './notebook/types';

export const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
export const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';

export const translateDisplayNameForK8s = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '');
export const isValidK8sName = (name?: string): boolean =>
  name === undefined || (name.length > 0 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name));

export const getProjectDisplayName = (project: ProjectKind): string =>
  getDisplayNameFromK8sResource(project);
export const getProjectDescription = (project: ProjectKind): string =>
  getDescriptionFromK8sResource(project);
export const getProjectOwner = (project: ProjectKind): string =>
  project.metadata.annotations?.['openshift.io/requester'] || '';
export const getProjectCreationTime = (project: ProjectKind): number =>
  project.metadata.creationTimestamp ? new Date(project.metadata.creationTimestamp).getTime() : 0;

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

export const typedBorderColor = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return 'var(--ai-project--BorderColor)';
    case ProjectObjectType.notebook:
      return 'var(--ai-notebook--BorderColor)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
      return 'var(--ai-pipeline--BorderColor)';
    case ProjectObjectType.clusterStorage:
      return 'var(--ai-cluster-storage--BorderColor)';
    case ProjectObjectType.modelServer:
      return 'var(--ai-model-server--BorderColor)';
    case ProjectObjectType.dataConnection:
      return 'var(--ai-data-connection--BorderColor)';
    case ProjectObjectType.user:
      return 'var(--ai-user--BorderColor)';
    case ProjectObjectType.group:
      return 'var(--ai-group--BorderColor)';
    default:
      return '';
  }
};

export const typedBackgroundColor = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return 'var(--ai-project--BackgroundColor)';
    case ProjectObjectType.notebook:
      return 'var(--ai-notebook--BackgroundColor)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
      return 'var(--ai-pipeline--BackgroundColor)';
    case ProjectObjectType.clusterStorage:
      return 'var(--ai-cluster-storage--BackgroundColor)';
    case ProjectObjectType.modelServer:
      return 'var(--ai-model-server--BackgroundColor)';
    case ProjectObjectType.dataConnection:
      return 'var(--ai-data-connection--BackgroundColor)';
    case ProjectObjectType.user:
      return 'var(--ai-user--BackgroundColor)';
    case ProjectObjectType.group:
      return 'var(--ai-group--BackgroundColor)';
    default:
      return '';
  }
};

export const typedObjectImage = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return projectImg;
    case ProjectObjectType.notebook:
      return notebookImg;
    case ProjectObjectType.pipeline:
      return pipelineImg;
    case ProjectObjectType.pipelineRun:
      return pipelineRunImg;
    case ProjectObjectType.clusterStorage:
      return clusterStorageImg;
    case ProjectObjectType.modelServer:
      return modelServerImg;
    case ProjectObjectType.dataConnection:
      return dataConnectionImg;
    case ProjectObjectType.user:
      return userImg;
    case ProjectObjectType.group:
      return groupImg;
    default:
      return '';
  }
};

export const typedEmptyImage = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return projectEmptyStateImg;
    case ProjectObjectType.notebook:
      return notebookEmptyStateImg;
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
      return pipelineEmptyStateImg;
    case ProjectObjectType.clusterStorage:
      return clusterStorageEmptyStateImg;
    case ProjectObjectType.modelServer:
      return modelServerEmptyStateImg;
    case ProjectObjectType.dataConnection:
      return dataConnectionEmptyStateImg;
    default:
      return '';
  }
};
