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
import {
  SecretKind,
  K8sAPIOptions,
  RoleBindingKind,
  InferenceServiceKind,
  ServiceAccountKind,
  RoleKind,
} from '@odh-dashboard/internal/k8sTypes';
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
import { type TokenAuthenticationFieldData } from '../../model-serving/src/components/deploymentWizard/fields/TokenAuthenticationField';

type CreatingInferenceServiceObject = {
  project: string;
  name: string;
  k8sName: string;
  modelType: string;
  hardwareProfile: Record<string, unknown>;
  modelFormat: Record<string, unknown>;
  externalRoute?: boolean;
  tokenAuth?: TokenAuthenticationFieldData;
  tokens?: TokenAuthenticationFieldData;
};

type TokenNames = {
  serviceAccountName: string;
  roleName: string;
  roleBindingName: string;
};

type TokenData = {
  uuid: string;
  name: string;
  error?: string;
};

export const getModelServingRuntimeName = (namespace: string): string =>
  `model-server-${namespace}`;

export const getModelServiceAccountName = (name: string): string => `${name}-sa`;

export const getModelRole = (name: string): string => `${name}-view-role`;
export const getModelRoleBinding = (name: string): string => `${name}-view`;

export const getTokenNames = (servingRuntimeName: string, namespace: string): TokenNames => {
  const name =
    servingRuntimeName !== '' ? servingRuntimeName : getModelServingRuntimeName(namespace);

  const serviceAccountName = getModelServiceAccountName(name);
  const roleName = getModelRole(name);
  const roleBindingName = getModelRoleBinding(name);

  return { serviceAccountName, roleName, roleBindingName };
};

export const createServiceAccountIfMissing = async (
  serviceAccount: ServiceAccountKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  getServiceAccount(serviceAccount.metadata.name, namespace).catch((e: unknown) => {
    if (
      e &&
      typeof e === 'object' &&
      'statusObject' in e &&
      e.statusObject &&
      typeof e.statusObject === 'object' &&
      'code' in e.statusObject &&
      e.statusObject.code === 404
    ) {
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
    if (
      e &&
      typeof e === 'object' &&
      'statusObject' in e &&
      e.statusObject &&
      typeof e.statusObject === 'object' &&
      'code' in e.statusObject &&
      e.statusObject.code === 404
    ) {
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
    if (
      e &&
      typeof e === 'object' &&
      'statusObject' in e &&
      e.statusObject &&
      typeof e.statusObject === 'object' &&
      'code' in e.statusObject &&
      e.statusObject.code === 404
    ) {
      return createRoleBinding(rolebinding, opts).catch((error: unknown) => {
        if (
          error &&
          typeof error === 'object' &&
          'statusObject' in error &&
          error.statusObject &&
          typeof error.statusObject === 'object' &&
          'code' in error.statusObject &&
          error.statusObject.code === 404 &&
          opts?.dryRun
        ) {
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
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName } = getTokenNames(deployedModelName, namespace);
  const deletedSecrets =
    existingSecrets
      ?.map((secret) => secret.metadata.name)
      .filter(
        (token: string) =>
          !fillData.tokens?.some((tokenEdit: TokenData) => tokenEdit.name === token),
      ) || [];

  return Promise.all<K8sStatus | SecretKind>([
    ...(fillData.tokens || [])
      .filter((token: TokenData) => translateDisplayNameForK8s(token.name) !== token.name)
      .map((token: TokenData) => {
        const secretToken = assembleSecretSA(token.name, serviceAccountName, namespace);
        return createSecret(secretToken, opts);
      }),
    ...deletedSecrets.map((secret) => deleteSecret(namespace, secret, opts)),
  ])
    .then(() => Promise.resolve())
    .catch((error) => Promise.reject(error));
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
    .then(() => createSecrets(fillData, deployedModelName, namespace, existingSecrets, opts))
    .catch((error) => Promise.reject(error));
};

// Helper function to convert TokenAuthenticationFieldData to the format expected by CreatingInferenceServiceObject
export const convertTokenAuthData = (tokenAuthData: TokenAuthenticationFieldData): string[] => {
  return tokenAuthData.map((token: TokenData) => token.name).filter(Boolean);
};
