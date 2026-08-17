import {
  MetadataAnnotation,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
  getConnectionTypeRef,
  getModelServingCompatibility,
  getModelServingConnectionTypeName,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/k8s-core';
import type {
  SecretKind,
  Connection,
  ConnectionTypeConfigMapObj,
  ProjectKind,
} from '@odh-dashboard/k8s-core';
import type { SecretOps } from '@odh-dashboard/plugin-core/host-api';
import { type TokenAuthenticationFieldData } from './fields/TokenAuthenticationField';
import { DeployExtension } from './deploying/useDeployMethod';
import { ExternalDataMap } from './ExternalDataLoader';
import { RunPreDeployFns } from './deploying/useWizardFieldPreDeploy';
import { RunPostDeployFns } from './deploying/useWizardFieldPostDeploy';
import {
  ModelLocationType,
  ModelLocationData,
  WizardFormData,
  type InitialWizardFormData,
  WizardStepTitle,
} from '../../shared/types/form-data';
import {
  handleConnectionCreation,
  handleSecretOwnerReferencePatch,
} from '../../concepts/connectionUtils';
import type { Deployment, DeploymentEndpoint } from '../../../extension-points';
import { DeploymentAssemblyFn } from '../../../extension-points/deployment-wizard';
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
  platformAuthCheck?: (deployment: Deployment) => boolean,
): TokenAuthenticationFieldData => {
  const isTokenAuthEnabled = isDeploymentAuthEnabled(deployment, platformAuthCheck);

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
  externalData: ExternalDataMap,
  secretOps: SecretOps,
  secretName?: string,
  deployMethod?: DeployExtension,
  existingDeployment?: Deployment,
  modelResource?: Deployment['model'],
  serverResource?: Deployment['server'],
  serverResourceTemplateName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
  applyAllFieldDataFn?: DeploymentAssemblyFn,
  runPreDeploy?: RunPreDeployFns,
  runPostDeploy?: RunPostDeployFns,
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

  // ----- Dry Runs -----

  // If connection name doesn't exist yet, it will fail the dry run
  const dryRunModelResource = structuredClone(modelResourceWithNamespace);
  delete dryRunModelResource?.metadata.annotations?.[MetadataAnnotation.ConnectionName];

  // Dry run order doesn't matter since they don't change cluster state
  const dryRuns: Promise<unknown>[] = [];
  dryRuns.push(
    handleConnectionCreation(
      secretOps,
      wizardState.createConnectionData.data,
      projectName,
      wizardState.modelLocationData.data,
      secretName,
      true,
      wizardState.modelLocationData.selectedConnection,
    ),
  );
  if (runPreDeploy && dryRunModelResource) {
    dryRuns.push(
      runPreDeploy(
        {
          modelServingPlatformId: deployMethod.platform,
          model: dryRunModelResource,
          server: serverResource,
        },
        existingDeployment,
        true,
      ),
    );
  }

  if (!overwrite) {
    dryRuns.push(
      deployMethod.deploy(
        wizardState,
        externalData,
        projectName,
        existingDeployment,
        dryRunModelResource,
        serverResource,
        serverResourceTemplateName,
        true,
        undefined,
        undefined,
        initialWizardData,
        applyAllFieldDataFn,
      ),
    );
  }
  if (runPostDeploy && dryRunModelResource) {
    dryRuns.push(
      runPostDeploy(
        {
          modelServingPlatformId: deployMethod.platform,
          model: dryRunModelResource,
          server: serverResource,
        },
        existingDeployment,
        true,
      ),
    );
  }
  await Promise.all(dryRuns);

  // ----- Real Runs -----

  // Create secret
  const newSecret = await handleConnectionCreation(
    secretOps,
    wizardState.createConnectionData.data,
    projectName,
    wizardState.modelLocationData.data,
    secretName,
    false,
    wizardState.modelLocationData.selectedConnection,
  );

  // newSecret.metadata.name is the name of the secret created during secret creation,
  const createdSecretName = newSecret?.metadata.name ?? secretName;

  // Create deployment
  const modelResourceWithConnection = structuredClone(modelResourceWithNamespace);
  if (createdSecretName && modelResourceWithConnection?.metadata.annotations) {
    modelResourceWithConnection.metadata.annotations[MetadataAnnotation.ConnectionName] =
      createdSecretName;
  }
  if (runPreDeploy && modelResourceWithConnection) {
    await runPreDeploy(
      {
        modelServingPlatformId: deployMethod.platform,
        model: modelResourceWithConnection,
        server: serverResource,
      },
      existingDeployment,
    );
  }
  const deploymentResult = await deployMethod.deploy(
    wizardState,
    externalData,
    projectName,
    existingDeployment,
    modelResourceWithConnection,
    serverResource,
    serverResourceTemplateName,
    false,
    createdSecretName,
    overwrite,
    initialWizardData,
    applyAllFieldDataFn,
  );

  // Potentially skip this if YAML is used and model location is set directly in the YAML
  if (newSecret && createdSecretName && wizardState.modelLocationData.data) {
    await handleSecretOwnerReferencePatch(
      secretOps,
      wizardState.createConnectionData.data,
      deploymentResult.model,
      wizardState.modelLocationData.data,
      createdSecretName,
      deploymentResult.model.metadata.uid ?? '',
      false,
    );
  }
  if (runPostDeploy) {
    await runPostDeploy(deploymentResult, existingDeployment);
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

export const shouldShowPreconfigureStep = (
  project: ProjectKind | null | undefined,
  existingData?: Pick<InitialWizardFormData, 'validatedConfigurations' | 'isEditing'>,
): boolean =>
  !project ||
  (!existingData?.isEditing && (existingData?.validatedConfigurations?.length ?? 0) > 0);
