import type { Deployment } from 'extension-points';
import { isValidModelType, type ModelTypeFieldData } from './fields/ModelTypeSelectField';

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
