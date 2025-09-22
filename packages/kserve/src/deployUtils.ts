import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  assembleSecretSA,
  createSecret,
  deleteSecret,
} from '@odh-dashboard/internal/api/k8s/secrets';
import {
  assembleServiceAccount,
  createServiceAccount,
  getServiceAccount,
} from '@odh-dashboard/internal/api/k8s/serviceAccounts';
import {
  generateRoleInferenceService,
  getRole,
  createRole,
} from '@odh-dashboard/internal/api/k8s/roles';
import {
  generateRoleBindingServiceAccount,
  getRoleBinding,
  createRoleBinding,
} from '@odh-dashboard/internal/api/k8s/roleBindings';
import { addOwnerReference } from '@odh-dashboard/internal/api/k8sUtils';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import {
  SecretKind,
  K8sAPIOptions,
  RoleBindingKind,
  InferenceServiceKind,
  ServiceAccountKind,
  RoleKind,
} from '@odh-dashboard/internal/k8sTypes';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import { type CreatingInferenceServiceObject } from './deploy';

const is404 = (error: unknown): boolean => {
  return getGenericErrorCode(error) === 404;
};

export const getModelServiceAccountName = (name: string): string => `${name}-sa`;

export const getModelRole = (name: string): string => `${name}-view-role`;
export const getModelRoleBinding = (name: string): string => `${name}-view`;

export const createServiceAccountIfMissing = async (
  serviceAccount: ServiceAccountKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  getServiceAccount(serviceAccount.metadata.name, namespace).catch((e: unknown) => {
    if (is404(e)) {
      return createServiceAccount(serviceAccount, opts);
    }
    return Promise.reject(e);
  });

export const createRoleIfMissing = async (
  role: RoleKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleKind> =>
  getRole(namespace, role.metadata.name).catch((e: unknown) => {
    if (is404(e)) {
      return createRole(role, opts);
    }
    return Promise.reject(e);
  });

export const createRoleBindingIfMissing = async (
  rolebinding: RoleBindingKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  getRoleBinding(namespace, rolebinding.metadata.name).catch((e: unknown) => {
    if (is404(e)) {
      return createRoleBinding(rolebinding, opts).catch((error: unknown) => {
        if (is404(error) && opts?.dryRun) {
          // If dryRun is enabled and the user is not Cluster Admin it seems that there's a k8s error
          // that raises a 404 trying to find the role, which is missing since it's a dryRun.
          return Promise.resolve(rolebinding);
        }
        return Promise.reject(error);
      });
    }
    return Promise.reject(e);
  });

export const createSecrets = async (
  fillData: CreatingInferenceServiceObject,
  deployedModelName: string,
  namespace: string,
  owner: InferenceServiceKind,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName } = getTokenNames(deployedModelName, namespace);
  const deletedSecrets =
    existingSecrets
      ?.map((secret) => secret.metadata.name)
      .filter((token: string) => !fillData.tokens?.some((tokenEdit) => tokenEdit.name === token)) ||
    [];
  const tokensToProcess = fillData.tokens || [];

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
  fillData: CreatingInferenceServiceObject,
  deployedModelName: string,
  namespace: string,
  createTokenAuth: boolean,
  owner: InferenceServiceKind,
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

  // For KServe, we need the inferenceservice view role
  const role = addOwnerReference(
    generateRoleInferenceService(roleName, deployedModelName, namespace),
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
    .then(() => createSecrets(fillData, deployedModelName, namespace, owner, existingSecrets, opts))
    .catch((error) => Promise.reject(error));
};
