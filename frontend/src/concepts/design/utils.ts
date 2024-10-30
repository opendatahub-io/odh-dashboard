import projectImg from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import notebookImg from '~/images/UI_icon-Red_Hat-Wrench-RGB.svg';
import pipelineImg from '~/images/UI_icon-Red_Hat-Branch-RGB.svg';
import pipelineRunImg from '~/images/UI_icon-Red_Hat-Double_arrow_right-RGB.svg';
import clusterStorageImg from '~/images/UI_icon-Red_Hat-Storage-RGB.svg';
import modelServerImg from '~/images/UI_icon-Red_Hat-Server-RGB.svg';
import registeredModelsImg from '~/images/Icon-Red_Hat-Layered_A_Black-RGB.svg';
import deployedModelsImg from '~/images/UI_icon-Red_Hat-Cubes-RGB.svg';
import deployingModelsImg from '~/images/UI_icon-Red_Hat-Server_upload-RGB.svg';
import dataConnectionImg from '~/images/UI_icon-Red_Hat-Connected-RGB.svg';
import userImg from '~/images/UI_icon-Red_Hat-User-RGB.svg';
import groupImg from '~/images/UI_icon-Red_Hat-Shared_workspace-RGB.svg';
import projectEmptyStateImg from '~/images/empty-state-project-overview.svg';
import notebookEmptyStateImg from '~/images/empty-state-notebooks.svg';
import pipelineEmptyStateImg from '~/images/empty-state-pipelines.svg';
import clusterStorageEmptyStateImg from '~/images/empty-state-cluster-storage.svg';
import modelServerEmptyStateImg from '~/images/empty-state-model-serving.svg';
import dataConnectionEmptyStateImg from '~/images/empty-state-data-connections.svg';
import modelRegistryEmptyStateImg from '~/images/empty-state-model-registries.svg';
import storageClassesEmptyStateImg from '~/images/empty-state-storage-classes.svg';
import modelRegistryMissingModelImg from '~/images/no-models-model-registry.svg';
import modelRegistryMissingVersionImg from '~/images/no-versions-model-registry.svg';

import './vars.scss';

export enum SectionType {
  setup = 'set-up',
  organize = 'organize',
  training = 'training',
  serving = 'serving',
}

export enum ProjectObjectType {
  project = 'project',
  projectContext = 'projectContext',
  notebook = 'notebook',
  pipelineSetup = 'pipeline-setup',
  pipeline = 'pipeline',
  pipelineRun = 'pipeline-run',
  clusterStorage = 'cluster-storage',
  modelServer = 'model-server',
  registeredModels = 'registered-models',
  deployedModels = 'deployed-models',
  deployingModels = 'deploying-models',
  dataConnection = 'data-connection',
  connections = 'connections',
  user = 'user',
  group = 'group',
  storageClasses = 'storageClasses',
}

export const typedBackgroundColor = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return 'var(--ai-project--BackgroundColor)';
    case ProjectObjectType.projectContext:
      return 'var(--ai-project-context--BackgroundColor)';
    case ProjectObjectType.notebook:
      return 'var(--ai-notebook--BackgroundColor)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
      return 'var(--ai-pipeline--BackgroundColor)';
    case ProjectObjectType.pipelineSetup:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.clusterStorage:
      return 'var(--ai-cluster-storage--BackgroundColor)';
    case ProjectObjectType.modelServer:
    case ProjectObjectType.registeredModels:
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.deployingModels:
      return 'var(--ai-model-server--BackgroundColor)';
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return 'var(--ai-data-connection--BackgroundColor)';
    case ProjectObjectType.user:
      return 'var(--ai-user--BackgroundColor)';
    case ProjectObjectType.group:
      return 'var(--ai-group--BackgroundColor)';
    default:
      return '';
  }
};

export const typedColor = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return 'var(--ai-project--Color)';
    case ProjectObjectType.projectContext:
      return 'var(--ai-project-context--Color)';
    case ProjectObjectType.notebook:
      return 'var(--ai-notebook--Color)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
      return 'var(--ai-pipeline--Color)';
    case ProjectObjectType.pipelineSetup:
      return 'var(--ai-set-up--Color)';
    case ProjectObjectType.clusterStorage:
      return 'var(--ai-cluster-storage--Color)';
    case ProjectObjectType.modelServer:
    case ProjectObjectType.registeredModels:
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.deployingModels:
      return 'var(--ai-model-server--Color)';
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return 'var(--ai-data-connection--Color)';
    case ProjectObjectType.user:
      return 'var(--ai-user--Color)';
    case ProjectObjectType.group:
      return 'var(--ai-group--Color)';
    default:
      return '';
  }
};

export const typedObjectImage = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
    case ProjectObjectType.projectContext:
      return projectImg;
    case ProjectObjectType.notebook:
      return notebookImg;
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineSetup:
      return pipelineImg;
    case ProjectObjectType.pipelineRun:
      return pipelineRunImg;
    case ProjectObjectType.clusterStorage:
      return clusterStorageImg;
    case ProjectObjectType.modelServer:
      return modelServerImg;
    case ProjectObjectType.registeredModels:
      return registeredModelsImg;
    case ProjectObjectType.deployedModels:
      return deployedModelsImg;
    case ProjectObjectType.deployingModels:
      return deployingModelsImg;
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return dataConnectionImg;
    case ProjectObjectType.user:
      return userImg;
    case ProjectObjectType.group:
      return groupImg;
    default:
      return '';
  }
};

export const typedEmptyImage = (objectType: ProjectObjectType, option?: string): string => {
  switch (objectType) {
    case ProjectObjectType.project:
    case ProjectObjectType.projectContext:
      return projectEmptyStateImg;
    case ProjectObjectType.notebook:
      return notebookEmptyStateImg;
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
    case ProjectObjectType.pipelineSetup:
      return pipelineEmptyStateImg;
    case ProjectObjectType.clusterStorage:
      return clusterStorageEmptyStateImg;
    case ProjectObjectType.modelServer:
      return modelServerEmptyStateImg;
    case ProjectObjectType.registeredModels:
      switch (option) {
        case 'MissingModel':
          return modelRegistryMissingModelImg;
        case 'MissingVersion':
          return modelRegistryMissingVersionImg;
        case 'MissingDeployment':
          return modelServerEmptyStateImg;
        default:
          return modelRegistryEmptyStateImg;
      }
    case ProjectObjectType.storageClasses:
      return storageClassesEmptyStateImg;
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return dataConnectionEmptyStateImg;
    default:
      return '';
  }
};

export const sectionTypeBackgroundColor = (sectionType: SectionType): string => {
  switch (sectionType) {
    case SectionType.setup:
      return 'var(--ai-set-up--BackgroundColor)';
    case SectionType.organize:
      return 'var(--ai-organize--BackgroundColor)';
    case SectionType.training:
      return 'var(--ai-training--BackgroundColor)';
    case SectionType.serving:
      return 'var(--ai-serving--BackgroundColor)';
    default:
      return '';
  }
};

export const sectionTypeBorderColor = (sectionType: SectionType): string => {
  switch (sectionType) {
    case SectionType.setup:
      return 'var(--ai-set-up--BorderColor)';
    case SectionType.organize:
      return 'var(--ai-organize--BorderColor)';
    case SectionType.training:
      return 'var(--ai-training--BorderColor)';
    case SectionType.serving:
      return 'var(--ai-serving--BorderColor)';
    default:
      return '';
  }
};
