import type { Deployment } from 'extension-points';
import { isValidModelType, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import {
  ConnectionTypeRefs,
  ModelLocationType,
  ModelLocationData,
  ExistingModelLocation,
  S3ModelLocation,
  OCIModelLocation,
} from './fields/modelLocationFields/types';
import { ModelLocationFieldData } from './fields/ModelLocationSelectField';

export const getDeploymentWizardRoute = (currentpath: string, deploymentName?: string): string => {
  if (deploymentName) {
    return `${currentpath}/deploy/edit/${deploymentName}`;
  }
  return `${currentpath}/deploy/create`;
};

export const getDeploymentWizardExitRoute = (currentPath: string): string => {
  let basePath = currentPath.substring(0, currentPath.lastIndexOf('deploy'));
  if (basePath.includes('projects')) {
    basePath += '?section=model-server';
  }
  return basePath;
};

export const getModelTypeFromDeployment = (
  deployment: Deployment,
): ModelTypeFieldData | undefined => {
  if (
    deployment.model.metadata.annotations?.['opendatahub.io/model-type'] &&
    isValidModelType(deployment.model.metadata.annotations['opendatahub.io/model-type'])
  ) {
    return deployment.model.metadata.annotations['opendatahub.io/model-type'];
  }
  return undefined;
};
export const isOCIModelLocation = (data?: ModelLocationData): data is OCIModelLocation => {
  return data?.type === ModelLocationType.OCI;
};

export const isS3ModelLocation = (data?: ModelLocationData): data is S3ModelLocation => {
  return data?.type === ModelLocationType.S3;
};

export const isExistingModelLocation = (
  data?: ModelLocationData,
): data is ExistingModelLocation => {
  return data?.type === 'existing';
};

export const mapStringToConnectionType = (value: string): ConnectionTypeRefs => {
  switch (value) {
    case ConnectionTypeRefs.S3:
      return ConnectionTypeRefs.S3;
    case ConnectionTypeRefs.OCI:
      return ConnectionTypeRefs.OCI;
    case ConnectionTypeRefs.URI:
      return ConnectionTypeRefs.URI;
    default:
      return ConnectionTypeRefs.S3;
  }
};

export const setupModelLocationData = (): ModelLocationData => {
  // TODO: Implement fully in next ticket RHOAIENG-32186
  return {
    type: ModelLocationType.URI,
    uri: 'https://test',
  };
};

export const setupModelLocationField = (): ModelLocationFieldData => {
  // TODO: Implement fully in next ticket RHOAIENG-32186
  return ModelLocationType.URI;
};
