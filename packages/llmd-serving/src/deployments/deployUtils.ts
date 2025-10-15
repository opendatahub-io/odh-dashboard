import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  assembleSecretSA,
  createSecret,
  deleteSecret,
} from '@odh-dashboard/internal/api/k8s/secrets';
import { assembleServiceAccount } from '@odh-dashboard/internal/api/k8s/serviceAccounts';
import { generateRoleBindingServiceAccount } from '@odh-dashboard/internal/api/k8s/roleBindings';
import { addOwnerReference } from '@odh-dashboard/internal/api/k8sUtils';
import { SecretKind, K8sAPIOptions, RoleKind, KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import {
  createServiceAccountIfMissing,
  createRoleIfMissing,
  createRoleBindingIfMissing,
} from '../../../kserve/src/deployUtils';
import { LLMInferenceServiceKind } from '../types';

export const generateRoleLLMInferenceService = (
  roleName: string,
  llmInferenceServiceName: string,
  namespace: string,
): RoleKind => {
  const role: RoleKind = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: roleName,
      namespace,
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      },
    },
    rules: [
      {
        verbs: ['get'],
        apiGroups: ['serving.kserve.io'],
        resources: ['llminferenceservices'],
        resourceNames: [llmInferenceServiceName],
      },
    ],
  };
  return role;
};

export const createSecrets = async (
  tokenAuth: { name: string; uuid: string; error?: string }[] | undefined,
  deployedModelName: string,
  namespace: string,
  owner: LLMInferenceServiceKind,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName } = getTokenNames(deployedModelName, namespace);
  const deletedSecrets =
    existingSecrets
      ?.map((secret) => secret.metadata.name)
      .filter((token: string) => !tokenAuth?.some((tokenEdit) => tokenEdit.name === token)) || [];
  const tokensToProcess = tokenAuth || [];

  await Promise.all<K8sStatus | SecretKind>([
    ...tokensToProcess.map((token) => {
      const secretToken = addOwnerReference(
        assembleSecretSA(token.name, serviceAccountName, namespace, undefined),
        owner,
      );
      return createSecret(secretToken, opts);
    }),
    ...deletedSecrets.map((secret) => deleteSecret(namespace, secret, opts)),
  ]);
};

export const setUpTokenAuth = async (
  tokenAuth: { name: string; uuid: string; error?: string }[] | undefined,
  deployedModelName: string,
  namespace: string,
  createTokenAuth: boolean,
  owner: LLMInferenceServiceKind,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName, roleName, roleBindingName } = getTokenNames(
    deployedModelName,
    namespace,
  );

  const serviceAccount = addOwnerReference(
    assembleServiceAccount(serviceAccountName, namespace),
    owner,
  );

  const role = addOwnerReference(
    generateRoleLLMInferenceService(roleName, deployedModelName, namespace),
    owner,
  );

  const roleBinding = addOwnerReference(
    generateRoleBindingServiceAccount(
      roleBindingName,
      serviceAccountName,
      {
        kind: 'Role',
        name: roleName,
      },
      namespace,
    ),
    owner,
  );

  return (
    createTokenAuth
      ? Promise.all([
          createServiceAccountIfMissing(serviceAccount, namespace, opts),
          createRoleIfMissing(role, namespace, opts),
        ]).then(() => createRoleBindingIfMissing(roleBinding, namespace, opts))
      : Promise.resolve()
  )
    .then(() =>
      createSecrets(tokenAuth, deployedModelName, namespace, owner, existingSecrets, opts),
    )
    .catch((error) => Promise.reject(error));
};
