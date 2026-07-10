// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting from ui-core for backward compatibility
export {
  SectionType,
  ProjectObjectType,
  typedIconColor,
  typedBackgroundColor,
  typedColor,
  sectionTypeIconColor,
  sectionTypeBackgroundColor,
  sectionTypeBorderColor,
  sectionTypeLabelColor,
} from '@odh-dashboard/ui-core';

// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- needed locally for image mapping functions
import { ProjectObjectType } from '@odh-dashboard/ui-core';

import projectImg from '#~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import notebookImg from '#~/images/UI_icon-Red_Hat-Wrench-RGB.svg';
import pipelineImg from '#~/images/UI_icon-Red_Hat-Branch-RGB.svg';
import pipelineRunImg from '#~/images/UI_icon-Red_Hat-Double_arrow_right-RGB.svg';
import clusterStorageImg from '#~/images/UI_icon-Red_Hat-Storage-RGB.svg';
import modelServerImg from '#~/images/UI_icon-Red_Hat-Server-RGB.svg';
import registeredModelsImg from '#~/images/Icon-Red_Hat-Layered_A_Black-RGB.svg';
import deployedModelsImg from '#~/images/UI_icon-Red_Hat-Cubes-RGB.svg';
import deployingModelsImg from '#~/images/UI_icon-Red_Hat-Server_upload-RGB.svg';
import dataConnectionImg from '#~/images/UI_icon-Red_Hat-Connected-RGB.svg';
import userImg from '#~/images/UI_icon-Red_Hat-User-RGB.svg';
import groupImg from '#~/images/UI_icon-Red_Hat-Shared_workspace-RGB.svg';
import projectEmptyStateImg from '#~/images/empty-state-project-overview.svg';
import notebookEmptyStateImg from '#~/images/empty-state-notebooks.svg';
import pipelineEmptyStateImg from '#~/images/empty-state-pipelines.svg';
import clusterStorageEmptyStateImg from '#~/images/empty-state-cluster-storage.svg';
import modelServerEmptyStateImg from '#~/images/empty-state-model-serving.svg';
import dataConnectionEmptyStateImg from '#~/images/empty-state-data-connections.svg';
import modelRegistryEmptyStateImg from '#~/images/empty-state-model-registries.svg';
import storageClassesEmptyStateImg from '#~/images/empty-state-storage-classes.svg';
import modelRegistryMissingModelImg from '#~/images/no-models-model-registry.svg';
import modelRegistryMissingVersionImg from '#~/images/no-versions-model-registry.svg';
import modelRegistrySelectImg from '#~/images/UI_icon-Red_Hat-Registered.svg';
import agentOpsImg from '#~/images/UI_icon-Red_Hat-Agentic_AI-Black.svg';

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
    case ProjectObjectType.modelRegistryContext:
      return modelRegistrySelectImg;
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.connectedModels:
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
    case ProjectObjectType.agentOps:
      return agentOpsImg;
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
