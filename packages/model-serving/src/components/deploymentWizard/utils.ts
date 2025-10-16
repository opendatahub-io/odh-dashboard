import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import { ProjectKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes.js';
import { isValidModelType, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import { type TokenAuthenticationFieldData } from './fields/TokenAuthenticationField';
import { ModelLocationType, ModelLocationData, WizardFormData } from './types';
import {
  handleConnectionCreation,
  handleSecretOwnerReferencePatch,
} from '../../concepts/connectionUtils';
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
  return data?.type === ModelLocationType.EXISTING;
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

export const deployModel = async (
  wizardState: WizardFormData,
  project: ProjectKind,
  secretName: string,
  exitWizard: () => void,
  deployMethod?: (
    wizardState: WizardFormData['state'],
    projectName: string,
    existingDeployment?: Deployment,
    serverResource?: ServingRuntimeKind,
    serverResourceTemplateName?: string,
    dryRun?: boolean,
    secretName?: string,
  ) => Promise<Deployment>,
  existingDeployment?: Deployment,
  serverResource?: ServingRuntimeKind,
  serverResourceTemplateName?: string,
): Promise<void> => {
  // Dry runs
  const [dryRunSecret] = await Promise.all([
    handleConnectionCreation(
      wizardState.state.createConnectionData.data,
      project.metadata.name,
      wizardState.state.modelLocationData.data,
      secretName,
      true,
      wizardState.state.modelLocationData.selectedConnection,
    ),
    deployMethod?.(
      wizardState.state,
      project.metadata.name,
      existingDeployment,
      serverResource,
      serverResourceTemplateName,
      true,
    ),
  ]);

  // The secret name is calculated in handleConnectionCreation dryRun
  // so ensure we're sending the correct name into the real deploy and secret creation methods
  const realSecretName = dryRunSecret?.metadata.name ?? secretName;

  // Create secret
  const newSecret = await handleConnectionCreation(
    wizardState.state.createConnectionData.data,
    project.metadata.name,
    wizardState.state.modelLocationData.data,
    realSecretName,
    false,
    wizardState.state.modelLocationData.selectedConnection,
  );
  // newSecret.metadata.name is the name of the secret created during secret creation,
  // use realSecretName as a fallback (should be the same)
  const actualSecretName = newSecret?.metadata.name ?? realSecretName;

  // Create deployment
  const deploymentResult = await deployMethod?.(
    wizardState.state,
    project.metadata.name,
    existingDeployment,
    serverResource,
    serverResourceTemplateName,
    false,
    actualSecretName,
  );

  if (!wizardState.state.modelLocationData.data || !deploymentResult) {
    throw new Error('Model location data or deployment result is missing');
  }

  await handleSecretOwnerReferencePatch(
    wizardState.state.createConnectionData.data,
    deploymentResult.model,
    wizardState.state.modelLocationData.data,
    actualSecretName,
    deploymentResult.model.metadata.uid ?? '',
    false,
  );

  exitWizard();
};
