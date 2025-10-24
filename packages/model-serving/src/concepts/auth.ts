import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import useFetch, {
  NotReadyError,
  type FetchOptions,
  type FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '@odh-dashboard/internal/const';
import { getSecretsByLabel } from '@odh-dashboard/internal/api/index';
import type { Deployment } from '../../extension-points';

export const isDeploymentAuthEnabled = (deployment: Deployment): boolean => {
  const annotation = deployment.model.metadata.annotations?.['security.opendatahub.io/enable-auth'];
  return annotation !== 'false';
};

const useDeploymentSecrets = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<SecretKind[]> => {
  const fetchSecrets = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getSecretsByLabel(LABEL_SELECTOR_DASHBOARD_RESOURCE, namespace);
  }, [namespace]);

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
    if (!deployment || !deployment.model.metadata.name || !deployment.model.metadata.namespace) {
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
