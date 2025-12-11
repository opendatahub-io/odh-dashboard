import {
  createSecret,
  getSecret,
  patchSecretWithOwnerReference,
  patchSecretWithProtocolAnnotation,
  hasProtocolAnnotation,
  deleteSecret,
  isGeneratedSecretName,
  getGeneratedSecretName,
} from '@odh-dashboard/internal/api/index';
import { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
import {
  assembleConnectionSecret,
  getConnectionProtocolType,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { CreateConnectionData } from '../components/deploymentWizard/fields/CreateConnectionInputFields';
import { ModelLocationData, ModelLocationType } from '../components/deploymentWizard/types';

export const handleConnectionCreation = async (
  createConnectionData: CreateConnectionData,
  project: string,
  modelLocationData?: ModelLocationData,
  secretName?: string,
  dryRun?: boolean,
  selectedConnection?: Connection,
): Promise<SecretKind | undefined> => {
  if (!modelLocationData) {
    return Promise.resolve(undefined);
  }
  const protocolType =
    (modelLocationData.connectionTypeObject
      ? getConnectionProtocolType(modelLocationData.connectionTypeObject)
      : undefined) ?? 'uri';

  // If the connection already exists, patch the protocol annotation if it needs it, but don't wait for it
  if (modelLocationData.type === ModelLocationType.EXISTING) {
    if (!dryRun) {
      getSecret(project, modelLocationData.connection ?? '')
        .then((secret) => {
          if (!hasProtocolAnnotation(secret)) {
            patchSecretWithProtocolAnnotation(secret, protocolType).catch((err) => {
              console.warn('Failed to patch protocol annotation:', err);
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to get secret for protocol annotation:', err);
        });
    }
    return Promise.resolve(undefined);
  }

  const connectionTypeName = modelLocationData.connectionTypeObject?.metadata.name ?? 'uri-v1';
  const actualSecretName = (() => {
    if (dryRun && !createConnectionData.saveConnection) {
      // Always generate a new name for non-saved secrets
      return getGeneratedSecretName();
    }
    // Otherwise, reuse whatever was passed or saved
    return secretName ?? createConnectionData.nameDesc?.k8sName.value ?? getGeneratedSecretName();
  })();

  const description = createConnectionData.nameDesc?.description ?? '';
  const newConnection = assembleConnectionSecret(
    project,
    connectionTypeName,
    createConnectionData.nameDesc ?? {
      name: actualSecretName,
      description,
      k8sName: {
        value: translateDisplayNameForK8s(actualSecretName),
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

  // Apply annotations
  const annotatedConnection = {
    ...newConnection,
    metadata: {
      ...newConnection.metadata,
      name: actualSecretName,
      annotations: {
        ...newConnection.metadata.annotations,
        'opendatahub.io/connection-type-protocol': protocolType,
      },
    },
  };
  if (!description || description === '') {
    delete annotatedConnection.metadata.annotations['openshift.io/description'];
  }

  // If not saving as connection
  if (!createConnectionData.saveConnection) {
    // Remove dashboard resource label so it doesn't show in connections list
    annotatedConnection.metadata.labels['opendatahub.io/dashboard'] = 'false';
  }

  if (dryRun) {
    const dryRunCreatedSecret = await createSecret(annotatedConnection, { dryRun: true });

    return dryRunCreatedSecret;
  }

  const oldSecretName = selectedConnection?.metadata.name;
  const newSecretName = actualSecretName;
  if (oldSecretName && oldSecretName !== newSecretName) {
    try {
      const existingSecret = await getSecret(project, oldSecretName);

      // Only delete if it was a generated secret
      if (isGeneratedSecretName(existingSecret.metadata.name)) {
        await deleteSecret(project, existingSecret.metadata.name);
      }
    } catch {
      console.error('Old secret not found, skipping delete');
    }
  }

  const createdSecret = await createSecret(annotatedConnection);
  const finalSecret = await getSecret(project, createdSecret.metadata.name);
  return finalSecret;
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
    modelLocationData.type !== ModelLocationType.EXISTING &&
    resource.metadata.namespace
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
