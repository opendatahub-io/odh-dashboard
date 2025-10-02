import {
  createSecret,
  getSecret,
  patchSecretWithOwnerReference,
} from '@odh-dashboard/internal/api/index';
import { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import {
  assembleConnectionSecret,
  getConnectionProtocolType,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { useResolvedDeploymentExtension } from './extensionUtils';
import { CreateConnectionData } from '../components/deploymentWizard/fields/CreateConnectionInputFields';
import {
  Deployment,
  ModelServingConnectionCreation,
  isModelServingConnectionCreation,
} from '../../extension-points';
import {
  ModelLocationData,
  ModelLocationType,
} from '../components/deploymentWizard/fields/modelLocationFields/types';

export const useConnectionCreation = (
  deployment?: Deployment,
): {
  handleConnectionCreation?: (
    createConnectionData: CreateConnectionData,
    project: string,
    modelLocationData?: ModelLocationData,
    secretName?: string,
    dryRun?: boolean,
  ) => Promise<SecretKind | undefined>;
  loaded: boolean;
  errors: Error[];
} => {
  const [extension, loaded, errors] =
    useResolvedDeploymentExtension<ModelServingConnectionCreation>(
      isModelServingConnectionCreation,
      deployment,
    );

  return {
    handleConnectionCreation: extension?.properties.handleConnectionCreation,
    loaded,
    errors,
  };
};

export const handleConnectionCreation = async (
  createConnectionData: CreateConnectionData,
  project: string,
  modelLocationData?: ModelLocationData,
  secretName?: string,
  dryRun?: boolean,
): Promise<SecretKind | undefined> => {
  // Don't do anything if the connection already exists
  if (modelLocationData?.type === ModelLocationType.EXISTING || !modelLocationData) {
    return Promise.resolve(undefined);
  }

  const connectionTypeName = modelLocationData.connectionTypeObject?.metadata.name ?? 'uri';

  const newConnection = assembleConnectionSecret(
    project,
    connectionTypeName,
    createConnectionData.nameDesc ?? {
      name: secretName ?? '',
      description: '',
      k8sName: {
        value: secretName ?? '',
        state: {
          immutable: false,
          invalidCharacters: false,
          invalidLength: false,
          maxLength: 0,
          touched: false,
        },
      },
    },
    modelLocationData.fieldValues,
  );

  // Apply protocol annotation based on base connection type
  const protocolType = modelLocationData.connectionTypeObject
    ? getConnectionProtocolType(modelLocationData.connectionTypeObject)
    : 'uri';

  const annotatedConnection = {
    ...newConnection,
    metadata: {
      ...newConnection.metadata,
      annotations: {
        ...newConnection.metadata.annotations,
        'opendatahub.io/connection-type-protocol': protocolType,
      },
    },
  };

  // If not saving as connection
  if (!createConnectionData.saveConnection) {
    // Remove dashboard resource label so it doesn't show in connections list
    annotatedConnection.metadata.labels['opendatahub.io/dashboard'] = 'false';
  }
  return createSecret(annotatedConnection, { dryRun: dryRun ?? false });
};

export const handleSecretOwnerReferencePatch = async (
  createConnectionData: CreateConnectionData,
  resource: K8sResourceCommon & { metadata: { name: string } },
  modelLocationData: ModelLocationData,
  secretName: string,
  uid: string,
  dryRun?: boolean,
): Promise<void> => {
  if (
    !createConnectionData.saveConnection &&
    !dryRun &&
    modelLocationData.type !== ModelLocationType.EXISTING
  ) {
    // Patch the secret with owner ref but don't wait for it
    try {
      const secret = await getSecret(resource.metadata.namespace ?? '', secretName);
      if (!uid) {
        console.warn('UID is not present, skipping owner reference patch', uid);
        return;
      }
      await patchSecretWithOwnerReference(secret, resource, uid);
    } catch (err) {
      console.warn('Skipping owner reference patch, secret not ready yet', err);
    }
  }
};
