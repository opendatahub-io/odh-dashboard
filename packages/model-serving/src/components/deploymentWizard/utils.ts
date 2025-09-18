import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import { isValidModelType, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import {
  ConnectionTypeRefs,
  ModelLocationType,
  ModelLocationData,
} from './fields/modelLocationFields/types';
import { type TokenAuthenticationFieldData } from './fields/TokenAuthenticationField';
import type { Deployment, DeploymentEndpoint } from '../../../extension-points';

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

export const isExistingModelLocation = (data?: ModelLocationData): data is ModelLocationData => {
  return data?.type === 'existing';
};

export const setupModelLocationData = (): ModelLocationData => {
  // TODO: Implement fully in next ticket RHOAIENG-32186
  return {
    type: ModelLocationType.NEW,
    connectionTypeObject: {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        labels: {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          'opendatahub.io/connection-type': 'true',
        },
        name: ConnectionTypeRefs.URI,
      },
    },
    fieldValues: {
      URI: 'https://test',
    },
    additionalFields: {},
  };
};

export const getExternalRouteFromDeployment = (deployment: Deployment): boolean => {
  return (
    deployment.endpoints?.some((endpoint: DeploymentEndpoint) => endpoint.type === 'external') ??
    false
  );
};

export const getTokenAuthenticationFromDeployment = (
  deployment: Deployment,
): TokenAuthenticationFieldData => {
  const isTokenAuthEnabled =
    deployment.model.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

  const tokens = [];
  if (isTokenAuthEnabled) {
    const { serviceAccountName } = getTokenNames(
      deployment.model.metadata.name,
      deployment.model.metadata.namespace,
    );
    if (serviceAccountName) {
      tokens.push({
        uuid: `token-${Date.now()}`,
        name: serviceAccountName,
        error: '',
      });
    }
  }

  return tokens;
};
