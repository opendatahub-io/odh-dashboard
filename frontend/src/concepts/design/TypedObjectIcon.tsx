import * as React from 'react';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { ProjectObjectType, typedColor } from '#~/concepts/design/utils';
import {
  BuildIcon,
  NotebookIcon,
  CreateAndTrainIcon,
  DataConnectionIcon,
  DeployedModelIcon,
  ProjectIcon,
  PipelineIcon,
  PipelineRunIcon,
  StorageIcon,
  ModelServerIcon,
  RegisteredModelIcon,
  UserIcon,
  GroupIcon,
  StorageClassIcon,
  NotebookImageIcon,
  ServingRuntimeIcon,
  ClusterSettingsIcon,
  EnabledApplicationsIcon,
  ExploreApplicationsIcon,
  CheckmarkIcon,
  ArtifactIcon,
  DistributedWorkloadIcon,
  AcceleratorProfileIcon,
  ModelIcon,
  SingleModelIcon,
  MultiModelIcon,
  PermissionsIcon,
  ExperimentIcon,
  ResourcesIcon,
  ModelCatalogIcon,
  ModelRegistrySelectIcon,
  ModelEvaluationIcon,
  LabTuningIcon,
} from '#~/images/icons';

type TypedObjectIconProps = SVGIconProps & {
  resourceType: ProjectObjectType;
  useTypedColor?: boolean;
  size?: number;
};
const TypedObjectIcon: React.FC<TypedObjectIconProps> = ({
  resourceType,
  useTypedColor,
  style,
  ...rest
}) => {
  let Icon;

  switch (resourceType) {
    case ProjectObjectType.project:
    case ProjectObjectType.projectContext:
      Icon = ProjectIcon;
      break;
    case ProjectObjectType.build:
      Icon = BuildIcon;
      break;
    case ProjectObjectType.notebook:
      Icon = NotebookIcon;
      break;
    case ProjectObjectType.notebookImage:
      Icon = NotebookImageIcon;
      break;
    case ProjectObjectType.pipeline:
    case ProjectObjectType.pipelineSetup:
      Icon = PipelineIcon;
      break;
    case ProjectObjectType.pipelineRun:
      Icon = PipelineRunIcon;
      break;
    case ProjectObjectType.pipelineExperiment:
      Icon = ExperimentIcon;
      break;
    case ProjectObjectType.pipelineExecution:
      Icon = CheckmarkIcon;
      break;
    case ProjectObjectType.pipelineArtifact:
      Icon = ArtifactIcon;
      break;
    case ProjectObjectType.modelCustomization:
      Icon = CreateAndTrainIcon;
      break;
    case ProjectObjectType.labTuning:
      Icon = LabTuningIcon;
      break;
    case ProjectObjectType.clusterStorage:
      Icon = StorageIcon;
      break;
    case ProjectObjectType.model:
      Icon = ModelIcon;
      break;
    case ProjectObjectType.singleModel:
      Icon = SingleModelIcon;
      break;
    case ProjectObjectType.multiModel:
      Icon = MultiModelIcon;
      break;
    case ProjectObjectType.modelCatalog:
      Icon = ModelCatalogIcon;
      break;
    case ProjectObjectType.modelServer:
      Icon = ModelServerIcon;
      break;
    case ProjectObjectType.registeredModels:
    case ProjectObjectType.modelRegistrySettings:
      Icon = RegisteredModelIcon;
      break;
    case ProjectObjectType.modelRegistryContext:
      Icon = ModelRegistrySelectIcon;
      break;
    case ProjectObjectType.deployedModels:
    case ProjectObjectType.deployingModels:
      Icon = DeployedModelIcon;
      break;
    case ProjectObjectType.connectedModels:
      Icon = CheckmarkIcon;
      break;
    case ProjectObjectType.servingRuntime:
      Icon = ServingRuntimeIcon;
      break;
    case ProjectObjectType.distributedWorkload:
      Icon = DistributedWorkloadIcon;
      break;
    case ProjectObjectType.dataConnection:
    case ProjectObjectType.connections:
      Icon = DataConnectionIcon;
      break;
    case ProjectObjectType.clusterSettings:
      Icon = ClusterSettingsIcon;
      break;
    case ProjectObjectType.acceleratorProfile:
      Icon = AcceleratorProfileIcon;
      break;
    case ProjectObjectType.permissions:
      Icon = PermissionsIcon;
      break;
    case ProjectObjectType.user:
      Icon = UserIcon;
      break;
    case ProjectObjectType.group:
      Icon = GroupIcon;
      break;
    case ProjectObjectType.storageClasses:
      Icon = StorageClassIcon;
      break;
    case ProjectObjectType.enabledApplications:
      Icon = EnabledApplicationsIcon;
      break;
    case ProjectObjectType.exploreApplications:
      Icon = ExploreApplicationsIcon;
      break;
    case ProjectObjectType.resources:
      Icon = ResourcesIcon;
      break;
    case ProjectObjectType.modelEvaluation:
      Icon = ModelEvaluationIcon;
      break;
    default:
      return null;
  }

  return (
    <Icon
      style={{
        color: useTypedColor ? typedColor(resourceType) : undefined,
        ...(style || {}),
      }}
      {...rest}
    />
  );
};

export default TypedObjectIcon;
