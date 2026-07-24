import {
  isGeneratedSecretName,
  getGeneratedSecretName,
  translateDisplayNameForK8s,
  assembleConnectionSecret,
  getConnectionProtocolType,
} from '@odh-dashboard/k8s-core';
import type { SecretKind, K8sNameDescriptionType, Connection } from '@odh-dashboard/k8s-core';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretOps } from '@odh-dashboard/plugin-core/host-api';
import type { CreateConnectionData } from '../components/deploymentWizard/fields/CreateConnectionInputFields';
import { ModelLocationData, ModelLocationType } from '../components/deploymentWizard/types';

const hasProtocolAnnotation = (resource: SecretKind): boolean =>
  !!resource.metadata.annotations?.['opendatahub.io/connection-type-protocol'];

export const handleConnectionCreation = async (
  ops: SecretOps,
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
      ops
        .getSecret(project, modelLocationData.connection ?? '')
        .then((secret) => {
          if (!hasProtocolAnnotation(secret)) {
            ops.patchSecretWithProtocolAnnotation(secret, protocolType).catch((err) => {
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
  const formSecretName = createConnectionData.nameDesc?.k8sName.value;
  const actualSecretName = (() => {
    if (createConnectionData.saveConnection && formSecretName) {
      return formSecretName;
    }
    const candidate = secretName ?? formSecretName;
    if (!candidate || isGeneratedSecretName(candidate)) {
      return getGeneratedSecretName();
    }
    return candidate;
  })();
  const description = createConnectionData.nameDesc?.description ?? '';

  const nameDescForAssembly = ((): K8sNameDescriptionType => {
    const stored = createConnectionData.nameDesc;
    if (!stored || isGeneratedSecretName(stored.name)) {
      return {
        name: actualSecretName,
        description,
        k8sName: actualSecretName,
      };
    }
    return {
      ...stored,
      k8sName: translateDisplayNameForK8s(stored.name) || stored.k8sName.value,
    };
  })();
  const newConnection = assembleConnectionSecret(
    project,
    connectionTypeName,
    nameDescForAssembly,
    modelLocationData.fieldValues,
  );

  // Apply annotations. When saveConnection is unchecked, mark the connection
  // hidden from the UI while keeping the dashboard label 'true' so the
  // model-serving controller still includes the secret in storage-config.
  const annotatedConnection = {
    ...newConnection,
    metadata: {
      ...newConnection.metadata,
      name: actualSecretName,
      annotations: {
        ...newConnection.metadata.annotations,
        'opendatahub.io/connection-type-protocol': protocolType,
        ...(!createConnectionData.saveConnection && {
          'opendatahub.io/connection-hidden': 'true',
        }),
      },
    },
  };
  if (!description || description === '') {
    delete annotatedConnection.metadata.annotations['openshift.io/description'];
  }

  if (dryRun) {
    const dryRunCreatedSecret = await ops.createSecret(annotatedConnection, { dryRun: true });

    return dryRunCreatedSecret;
  }

  const oldSecretName = selectedConnection?.metadata.name;
  const newSecretName = actualSecretName;
  if (oldSecretName && oldSecretName !== newSecretName) {
    try {
      const existingSecret = await ops.getSecret(project, oldSecretName);

      // Only delete if it was a generated secret
      if (isGeneratedSecretName(existingSecret.metadata.name)) {
        await ops.deleteSecret(project, existingSecret.metadata.name);
      }
    } catch {
      console.error('Old secret not found, skipping delete');
    }
  }

  const createdSecret = await ops.createSecret(annotatedConnection);
  const finalSecret = await ops.getSecret(project, createdSecret.metadata.name);
  return finalSecret;
};

export const handleSecretOwnerReferencePatch = async (
  ops: SecretOps,
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
      const secret = await ops.getSecret(resource.metadata.namespace ?? '', secretName);
      if (!uid) {
        console.warn('UID is not present, skipping owner reference patch', uid);
        return;
      }
      await ops.patchSecretWithOwnerReference(secret, resource, uid);
    } catch (err) {
      console.warn('Skipping owner reference patch, secret not ready yet', err);
    }
  }
};
