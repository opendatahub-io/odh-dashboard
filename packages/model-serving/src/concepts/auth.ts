import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind, K8sAPIOptions, RoleKind, RoleBindingKind } from '@odh-dashboard/k8s-core';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import {
  assembleSecretSA,
  createSecret,
  deleteSecret,
  replaceSecret,
} from '@odh-dashboard/internal/api/k8s/secrets';
import {
  assembleServiceAccount,
  createServiceAccount,
  getServiceAccount,
} from '@odh-dashboard/internal/api/k8s/serviceAccounts';
import { getRole, createRole } from '@odh-dashboard/internal/api/k8s/roles';
import {
  generateRoleBindingServiceAccount,
  getRoleBinding,
  createRoleBinding,
} from '@odh-dashboard/internal/api/k8s/roleBindings';
import { addOwnerReference } from '@odh-dashboard/internal/api/k8sUtils';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import type { ServiceAccountKind } from '@odh-dashboard/internal/k8sTypes';
import useFetch, {
  NotReadyError,
  type FetchOptions,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '@odh-dashboard/ui-core/utilities';
import { useHostApiInfra } from '@odh-dashboard/plugin-core/host-api';
import type { Deployment } from '../../extension-points';

export type TokenAuthEntry = {
  displayName: string;
  k8sName?: string;
  uuid: string;
  error?: string;
};

const getModelServingRuntimeName = (namespace: string): string => `model-server-${namespace}`;
const getModelServiceAccountName = (name: string): string => `${name}-sa`;
const getModelRole = (name: string): string => `${name}-view-role`;
const getModelRoleBinding = (name: string): string => `${name}-view`;

export const getTokenNames = (
  resourceName: string,
  namespace: string,
): {
  serviceAccountName: string;
  roleName: string;
  roleBindingName: string;
  resolvedName: string;
} => {
  const name = resourceName !== '' ? resourceName : getModelServingRuntimeName(namespace);

  const serviceAccountName = getModelServiceAccountName(name);
  const roleName = getModelRole(name);
  const roleBindingName = getModelRoleBinding(name);

  return { serviceAccountName, roleName, roleBindingName, resolvedName: name };
};

const is404 = (error: unknown): boolean => getGenericErrorCode(error) === 404;
const is409 = (error: unknown): boolean => getGenericErrorCode(error) === 409;

export type TokenAuthResourceType = 'inferenceservices' | 'llminferenceservices';

export const generateRole = (
  roleName: string,
  resourceName: string,
  namespace: string,
  resourceType: TokenAuthResourceType,
): RoleKind => ({
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
      resources: [resourceType],
      resourceNames: [resourceName],
    },
  ],
});

export const createServiceAccountIfMissing = async (
  serviceAccount: ServiceAccountKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  getServiceAccount(serviceAccount.metadata.name, namespace).catch((e: unknown) => {
    if (is404(e)) {
      return createServiceAccount(serviceAccount, opts).catch((createError: unknown) => {
        if (is409(createError)) {
          return getServiceAccount(serviceAccount.metadata.name, namespace);
        }
        return Promise.reject(createError);
      });
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
      return createRole(role, opts).catch((createError: unknown) => {
        if (is409(createError)) {
          return getRole(namespace, role.metadata.name);
        }
        return Promise.reject(createError);
      });
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
        if (is409(error)) {
          return getRoleBinding(namespace, rolebinding.metadata.name);
        }
        if (is404(error) && opts?.dryRun) {
          return Promise.resolve(rolebinding);
        }
        return Promise.reject(error);
      });
    }
    return Promise.reject(e);
  });

export const createTokenSecrets = async (
  tokenAuth: TokenAuthEntry[] | undefined,
  deployedModelName: string,
  namespace: string,
  owner: K8sResourceCommon,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  if (tokenAuth === undefined) {
    return;
  }

  const { serviceAccountName } = getTokenNames(deployedModelName, namespace);
  const deletedSecrets =
    existingSecrets
      ?.map((secret) => secret.metadata.name)
      .filter((token: string) => !tokenAuth.some((tokenEdit) => tokenEdit.k8sName === token)) || [];

  await Promise.all<SecretKind>(
    tokenAuth.map((token) => {
      const secretToken = addOwnerReference(
        assembleSecretSA(token.displayName, serviceAccountName, namespace, token.k8sName),
        owner,
      );
      return token.k8sName ? replaceSecret(secretToken, opts) : createSecret(secretToken, opts);
    }),
  );

  await Promise.all<K8sStatus>(
    deletedSecrets.map((secret) => deleteSecret(namespace, secret, opts)),
  );
};

export const setUpTokenAuth = async (
  tokenAuth: TokenAuthEntry[] | undefined,
  deployedModelName: string,
  namespace: string,
  createTokenAuthResources: boolean,
  owner: K8sResourceCommon,
  resourceType: TokenAuthResourceType,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName, roleName, roleBindingName, resolvedName } = getTokenNames(
    deployedModelName,
    namespace,
  );

  const serviceAccount = addOwnerReference(
    assembleServiceAccount(serviceAccountName, namespace),
    owner,
  );

  const role = addOwnerReference(
    generateRole(roleName, resolvedName, namespace, resourceType),
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
    createTokenAuthResources
      ? Promise.all([
          createServiceAccountIfMissing(serviceAccount, namespace, opts),
          createRoleIfMissing(role, namespace, opts),
        ]).then(() => createRoleBindingIfMissing(roleBinding, namespace, opts))
      : Promise.resolve()
  ).then(() =>
    createTokenSecrets(tokenAuth, deployedModelName, namespace, owner, existingSecrets, opts),
  );
};

export const isDeploymentAuthEnabled = (
  deployment: Deployment,
  platformAuthCheck?: (deployment: Deployment) => boolean,
): boolean => {
  if (platformAuthCheck) {
    return platformAuthCheck(deployment);
  }
  const annotation = deployment.model.metadata.annotations?.['security.opendatahub.io/enable-auth'];
  return annotation !== 'false';
};

const useDeploymentSecrets = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<SecretKind[]> => {
  const { getSecretsByLabel } = useHostApiInfra();

  const fetchSecrets = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getSecretsByLabel(LABEL_SELECTOR_DASHBOARD_RESOURCE, namespace);
  }, [getSecretsByLabel, namespace]);

  return useFetch<SecretKind[]>(fetchSecrets, [], fetchOptions);
};

/**
 * @param deployment the deployment to get the auth tokens for
 * @returns an array of secrets for the service account associated with the deployment
 *
 * 4 main things for model serving auth:
 * - 1 ServiceAccount is made called "`<k8s-deployment-name>-sa`"
 * - 1 Role is made called "`<k8s-deployment-name>-view-role`"
 * - 1 RoleBinding is made called "`<k8s-deployment-name>`-view"
 * - N Secrets are made called "`<secret-display-name>`-`<service-account-k8s-name>`"
 *
 * Example:
 * - Deployment name: "`my-deployment`"
 * - ServiceAccount name: "`my-deployment-sa`"
 * - Role name: "`my-deployment-view-role`"
 * - RoleBinding name: "`my-deployment-view`"
 * - Secret name: "`my-secret-my-deployment-sa`"
 * - Secret name 2: "`my-secret2-my-deployment-sa`"
 */
export const useDeploymentAuthTokens = (
  deployment?: Deployment | null,
): FetchStateObject<SecretKind[]> => {
  const {
    data: projectSecrets,
    loaded,
    error,
    refresh,
  } = useDeploymentSecrets(deployment?.model.metadata.namespace);

  const deploymentSecrets = React.useMemo(() => {
    if (!deployment?.model.metadata.name || !deployment.model.metadata.namespace) {
      return [];
    }

    // Calculate the "<k8s-deployment-name>-sa" service account name
    const { serviceAccountName } = getTokenNames(
      deployment.model.metadata.name,
      deployment.model.metadata.namespace,
    );

    // Filter the secrets to only include the ones that match the service account name
    return projectSecrets.filter(
      (secret) =>
        secret.metadata.annotations?.['kubernetes.io/service-account.name'] === serviceAccountName,
    );
  }, [projectSecrets, deployment?.model.metadata.name, deployment?.model.metadata.namespace]);

  return { data: deploymentSecrets, loaded, error, refresh };
};
