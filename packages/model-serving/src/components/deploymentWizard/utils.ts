import { MetadataAnnotation, type SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { getGeneratedSecretName } from '@odh-dashboard/internal/api/index';
import {
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '@odh-dashboard/internal/concepts/k8s/utils';
import {
  getConnectionTypeRef,
  getModelServingCompatibility,
  getModelServingConnectionTypeName,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import {
  Connection,
  ConnectionTypeConfigMapObj,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { type TokenAuthenticationFieldData } from './fields/TokenAuthenticationField';
import {
  ModelLocationType,
  ModelLocationData,
  WizardFormData,
  type InitialWizardFormData,
  WizardStepTitle,
} from './types';
import { DeployExtension } from './deploying/useDeployMethod';
import {
  handleConnectionCreation,
  handleSecretOwnerReferencePatch,
} from '../../concepts/connectionUtils';
import type {
  Deployment,
  DeploymentEndpoint,
  DeploymentAssemblyFn,
} from '../../../extension-points';
import { isDeploymentAuthEnabled } from '../../concepts/auth';

export const getDeploymentWizardRoute = (): string => {
  return '/ai-hub/models/deployments/deploy';
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
  wizardState: WizardFormData['state'],
  secretName?: string,
  deployMethod?: DeployExtension,
  existingDeployment?: Deployment,
  modelResource?: Deployment['model'],
  serverResource?: Deployment['server'],
  serverResourceTemplateName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
  applyFieldData?: DeploymentAssemblyFn,
  runPreDeploy?: (deployment: Deployment, existingDeployment?: Deployment) => Promise<Deployment>,
  runPostDeploy?: (
    deployedModel: Deployment['model'],
    existingDeployment?: Deployment,
  ) => Promise<void>,
): Promise<Deployment> => {
  const projectName = wizardState.project.projectName || modelResource?.metadata.namespace;
  if (!projectName) {
    throw new Error('Project is required');
  }
  let modelResourceWithNamespace = modelResource;
  if (modelResource && !modelResource.metadata.namespace) {
    // Use the project user came from if they didn't specify one in yaml edit
    modelResourceWithNamespace = structuredClone(modelResource);
    modelResourceWithNamespace.metadata.namespace = projectName;
  }

  if (!deployMethod) {
    throw new Error('Deploy method is required. Model serving platform could be missing.');
  }

  // If connection name doesn't exist yet, it will fail the dry run
  const dryRunModelResource = structuredClone(modelResourceWithNamespace);
  delete dryRunModelResource?.metadata.annotations?.[MetadataAnnotation.ConnectionName];

  // Dry runs
  await Promise.all([
    handleConnectionCreation(
      wizardState.createConnectionData.data,
      projectName,
      wizardState.modelLocationData.data,
      secretName,
      true,
      wizardState.modelLocationData.selectedConnection,
    ),
    ...(!overwrite
      ? [
          deployMethod.deploy(
            wizardState,
            projectName,
            existingDeployment,
            dryRunModelResource,
            serverResource,
            serverResourceTemplateName,
            true,
            undefined,
            undefined,
            initialWizardData,
            applyFieldData,
          ),
        ]
      : []),
  ]);
  if (runPreDeploy && modelResource) {
    await runPreDeploy(
      {
        modelServingPlatformId: deployMethod.platform,
        model: modelResource,
        server: serverResource,
      },
      existingDeployment,
    );
  }

  // Create secret
  const newSecret = await handleConnectionCreation(
    wizardState.createConnectionData.data,
    projectName,
    wizardState.modelLocationData.data,
    secretName,
    false,
    wizardState.modelLocationData.selectedConnection,
  );

  // newSecret.metadata.name is the name of the secret created during secret creation,
  const createdSecretName = newSecret?.metadata.name ?? secretName ?? getGeneratedSecretName();

  // Create deployment
  const modelResourceWithConnection = structuredClone(modelResourceWithNamespace);
  if (modelResourceWithConnection?.metadata.annotations) {
    modelResourceWithConnection.metadata.annotations[MetadataAnnotation.ConnectionName] =
      createdSecretName;
  }
  const deploymentResult = await deployMethod.deploy(
    wizardState,
    projectName,
    existingDeployment,
    modelResourceWithConnection,
    serverResource,
    serverResourceTemplateName,
    false,
    createdSecretName,
    overwrite,
    initialWizardData,
    applyFieldData,
  );

  // Potentially skip this if YAML is used and model location is set directly in the YAML
  if (newSecret && createdSecretName && wizardState.modelLocationData.data) {
    await handleSecretOwnerReferencePatch(
      wizardState.createConnectionData.data,
      deploymentResult.model,
      wizardState.modelLocationData.data,
      createdSecretName,
      deploymentResult.model.metadata.uid ?? '',
      false,
    );
  }
  if (runPostDeploy) {
    await runPostDeploy(deploymentResult.model, existingDeployment);
  }

  return deploymentResult;
};

export const resolveConnectionType = (
  connection: Connection,
  connectionTypes: ConnectionTypeConfigMapObj[],
): ConnectionTypeConfigMapObj | undefined => {
  const connectionTypeRef = getConnectionTypeRef(connection);
  const connectionType = connectionTypes.find((ct) => ct.metadata.name === connectionTypeRef);
  // If we find the connection type, return it
  if (connectionType) {
    return connectionType;
  }
  const compatibleTypes = getModelServingCompatibility(connection);

  // If we don't find the connection type, return the first compatible type
  switch (compatibleTypes[0]) {
    case ModelServingCompatibleTypes.S3ObjectStorage:
      return connectionTypes.find(
        (ct) =>
          ct.metadata.name ===
          getModelServingConnectionTypeName(ModelServingCompatibleTypes.S3ObjectStorage),
      );
    case ModelServingCompatibleTypes.OCI:
      return connectionTypes.find(
        (ct) =>
          ct.metadata.name === getModelServingConnectionTypeName(ModelServingCompatibleTypes.OCI),
      );
    case ModelServingCompatibleTypes.URI:
      return connectionTypes.find(
        (ct) =>
          ct.metadata.name === getModelServingConnectionTypeName(ModelServingCompatibleTypes.URI),
      );
    default:
      return undefined;
  }
};

export const isWizardStepTitle = (value: string): value is WizardStepTitle => {
  return Object.values(WizardStepTitle).some((title) => title === value);
};
