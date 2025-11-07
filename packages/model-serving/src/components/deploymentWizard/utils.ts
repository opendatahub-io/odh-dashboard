import { ServingRuntimeKind, type SecretKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '@odh-dashboard/internal/concepts/k8s/utils';
import { isValidModelType, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import { type TokenAuthenticationFieldData } from './fields/TokenAuthenticationField';
import {
  ModelLocationType,
  ModelLocationData,
  WizardFormData,
  type InitialWizardFormData,
} from './types';
import {
  handleConnectionCreation,
  handleSecretOwnerReferencePatch,
} from '../../concepts/connectionUtils';
import type { Deployment, DeploymentEndpoint } from '../../../extension-points';
import { isDeploymentAuthEnabled } from '../../concepts/auth';

export const getDeploymentWizardRoute = (): string => {
  return '/ai-hub/deployments/deploy';
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
  deploymentSecrets: SecretKind[],
): TokenAuthenticationFieldData => {
  const isTokenAuthEnabled = isDeploymentAuthEnabled(deployment);

  if (isTokenAuthEnabled) {
    return deploymentSecrets.map((secret) => ({
      uuid: secret.metadata.uid ?? '',
      k8sName: getResourceNameFromK8sResource(secret),
      displayName: getDisplayNameFromK8sResource(secret),
      error: '',
    }));
  }

  return [];
};

export const deployModel = async (
  wizardState: WizardFormData,
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
    overwrite?: boolean,
    initialWizardData?: InitialWizardFormData,
  ) => Promise<Deployment>,
  existingDeployment?: Deployment,
  serverResource?: ServingRuntimeKind,
  serverResourceTemplateName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
): Promise<void> => {
  const { projectName } = wizardState.state.project;
  if (!projectName) {
    throw new Error('Project is required');
  }
  // Dry runs
  const [dryRunSecret] = await Promise.all([
    handleConnectionCreation(
      wizardState.state.createConnectionData.data,
      projectName,
      wizardState.state.modelLocationData.data,
      secretName,
      true,
      wizardState.state.modelLocationData.selectedConnection,
    ),
    ...(!overwrite
      ? [
          deployMethod?.(
            wizardState.state,
            projectName,
            existingDeployment,
            serverResource,
            serverResourceTemplateName,
            true,
            undefined,
            undefined,
            initialWizardData,
          ),
        ]
      : []),
  ]);

  // The secret name is calculated in handleConnectionCreation dryRun
  // so ensure we're sending the correct name into the real deploy and secret creation methods
  const realSecretName = dryRunSecret?.metadata.name ?? secretName;

  // Create secret
  const newSecret = await handleConnectionCreation(
    wizardState.state.createConnectionData.data,
    projectName,
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
    projectName,
    existingDeployment,
    serverResource,
    serverResourceTemplateName,
    false,
    actualSecretName,
    overwrite,
    initialWizardData,
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
