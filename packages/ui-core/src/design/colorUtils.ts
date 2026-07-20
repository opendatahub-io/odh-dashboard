import { ProjectObjectType, SectionType } from './types';

import './vars.scss';

export const typedIconColor = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return 'var(--ai-project--IconColor)';
    case ProjectObjectType.projectContext:
      return 'var(--ai-project-context--IconColor)';
    case ProjectObjectType.notebook:
      return 'var(--ai-notebook--IconColor)';
    case ProjectObjectType.notebookImage:
      return 'var(--ai-set-up--IconColor)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
    case ProjectObjectType.pipelineExperiment:
    case ProjectObjectType.pipelineExecution:
    case ProjectObjectType.pipelineArtifact:
    case ProjectObjectType.modelCatalog:
    case ProjectObjectType.promptManagement:
      return 'var(--ai-pipeline--IconColor)';
    case ProjectObjectType.pipelineSetup:
      return 'var(--ai-set-up--IconColor)';
    case ProjectObjectType.clusterStorage:
    case ProjectObjectType.storageClasses:
      return 'var(--ai-cluster-storage--IconColor)';
    case ProjectObjectType.model:
    case ProjectObjectType.singleModel:
    case ProjectObjectType.multiModel:
    case ProjectObjectType.modelServer:
    case ProjectObjectType.registeredModels:
    case ProjectObjectType.modelRegistry:
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.deployingModels:
      return 'var(--ai-model-server--IconColor)';
    case ProjectObjectType.connectedModels:
    case ProjectObjectType.modelRegistrySettings:
      return 'var(--ai-set-up--IconColor)';
    case ProjectObjectType.modelRegistryContext:
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return 'var(--ai-data-connection--IconColor)';
    case ProjectObjectType.user:
      return 'var(--ai-user--IconColor)';
    case ProjectObjectType.group:
      return 'var(--ai-group--IconColor)';
    case ProjectObjectType.permissions:
      return 'var(--ai-set-up--IconColor)';
    case ProjectObjectType.enabledApplications:
    case ProjectObjectType.exploreApplications:
      return 'var(--ai-config--IconColor)';
    case ProjectObjectType.resources:
      return 'var(--ai-general--IconColor)';
    case ProjectObjectType.distributedWorkload:
    case ProjectObjectType.mcpCatalog:
    case ProjectObjectType.agentsCatalog:
    case ProjectObjectType.agentOps:
      return 'var(--ai-serving--IconColor)';
    case ProjectObjectType.clusterSettings:
    case ProjectObjectType.hardwareProfile:
      return 'var(--ai-set-up--IconColor)';
    case ProjectObjectType.modelEvaluation:
      return 'var(--ai-model-server--IconColor)';
    case ProjectObjectType.servingRuntime:
      return 'var(--ai-set-up--IconColor)';
    case ProjectObjectType.taskAssistant:
      return 'var(--ai-general--IconColor)';
    case ProjectObjectType.apiKeys:
      return 'var(--ai-organize--IconColor)';
    default:
      return '';
  }
};

export const typedBackgroundColor = (objectType: ProjectObjectType): string => {
  switch (objectType) {
    case ProjectObjectType.project:
      return 'var(--ai-project--BackgroundColor)';
    case ProjectObjectType.projectContext:
      return 'var(--ai-project-context--BackgroundColor)';
    case ProjectObjectType.notebook:
      return 'var(--ai-notebook--BackgroundColor)';
    case ProjectObjectType.notebookImage:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
    case ProjectObjectType.pipelineExperiment:
    case ProjectObjectType.pipelineExecution:
    case ProjectObjectType.pipelineArtifact:
    case ProjectObjectType.modelCatalog:
    case ProjectObjectType.promptManagement:
      return 'var(--ai-pipeline--BackgroundColor)';
    case ProjectObjectType.pipelineSetup:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.clusterStorage:
    case ProjectObjectType.storageClasses:
      return 'var(--ai-cluster-storage--BackgroundColor)';
    case ProjectObjectType.model:
    case ProjectObjectType.singleModel:
    case ProjectObjectType.multiModel:
    case ProjectObjectType.modelServer:
    case ProjectObjectType.registeredModels:
    case ProjectObjectType.modelRegistry:
    case ProjectObjectType.modelRegistryContext:
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.deployingModels:
    case ProjectObjectType.connectedModels:
    case ProjectObjectType.modelCustomization:
    case ProjectObjectType.modelEvaluation:
    case ProjectObjectType.labTuning:
      return 'var(--ai-model-server--BackgroundColor)';
    case ProjectObjectType.modelRegistrySettings:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return 'var(--ai-data-connection--BackgroundColor)';
    case ProjectObjectType.user:
      return 'var(--ai-user--BackgroundColor)';
    case ProjectObjectType.group:
      return 'var(--ai-group--BackgroundColor)';
    case ProjectObjectType.permissions:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.enabledApplications:
    case ProjectObjectType.exploreApplications:
      return 'var(--ai-config--BackgroundColor)';
    case ProjectObjectType.resources:
      return 'var(--ai-general--BackgroundColor)';
    case ProjectObjectType.distributedWorkload:
    case ProjectObjectType.mcpCatalog:
    case ProjectObjectType.agentsCatalog:
    case ProjectObjectType.agentOps:
      return 'var(--ai-serving--BackgroundColor)';
    case ProjectObjectType.clusterSettings:
    case ProjectObjectType.hardwareProfile:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.servingRuntime:
      return 'var(--ai-set-up--BackgroundColor)';
    case ProjectObjectType.taskAssistant:
      return 'var(--ai-general--BackgroundColor)';
    case ProjectObjectType.apiKeys:
      return 'var(--ai-organize--BackgroundColor)';
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
    case ProjectObjectType.notebookImage:
      return 'var(--ai-training--BackgroundColor)';
    case ProjectObjectType.build:
      return 'var(--ai-notebook--Color)';
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineRun:
    case ProjectObjectType.pipelineExecution:
    case ProjectObjectType.pipelineArtifact:
    case ProjectObjectType.modelCatalog:
      return 'var(--ai-pipeline--Color)';
    case ProjectObjectType.pipelineSetup:
      return 'var(--ai-set-up--Color)';
    case ProjectObjectType.clusterStorage:
      return 'var(--ai-cluster-storage--Color)';
    case ProjectObjectType.modelServer:
    case ProjectObjectType.registeredModels:
    case ProjectObjectType.modelRegistry:
    case ProjectObjectType.modelRegistryContext:
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.deployingModels:
    case ProjectObjectType.connectedModels:
    case ProjectObjectType.modelCustomization:
    case ProjectObjectType.labTuning:
      return 'var(--ai-model-server--Color)';
    case ProjectObjectType.modelRegistrySettings:
      return 'var(--ai-set-up--Color)';
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      return 'var(--ai-data-connection--Color)';
    case ProjectObjectType.user:
      return 'var(--ai-user--Color)';
    case ProjectObjectType.group:
      return 'var(--ai-group--Color)';
    case ProjectObjectType.mcpCatalog:
    case ProjectObjectType.agentsCatalog:
    case ProjectObjectType.agentOps:
      return 'var(--ai-serving--Color)';
    default:
      return '';
  }
};

export const sectionTypeIconColor = (sectionType: SectionType): string => {
  switch (sectionType) {
    case SectionType.setup:
      return 'var(--ai-set-up--IconColor)';
    case SectionType.organize:
      return 'var(--ai-organize--IconColor)';
    case SectionType.training:
      return 'var(--ai-training--IconColor)';
    case SectionType.serving:
      return 'var(--ai-serving--IconColor)';
    case SectionType.general:
      return 'var(--ai-general--IconColor)';
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
    case SectionType.general:
      return 'var(--ai-general--BackgroundColor)';
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
    case SectionType.general:
      return 'var(--ai-general--BorderColor)';
    default:
      return '';
  }
};

export const sectionTypeLabelColor = (
  sectionType: SectionType,
): 'orange' | 'teal' | 'purple' | 'grey' => {
  switch (sectionType) {
    case SectionType.setup:
    case SectionType.organize:
      return 'orange';
    case SectionType.training:
      return 'teal';
    case SectionType.serving:
      return 'purple';
    case SectionType.general:
    default:
      return 'grey';
  }
};
