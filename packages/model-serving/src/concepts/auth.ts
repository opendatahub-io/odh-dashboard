import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import type { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { Deployment } from '../../extension-points';

export const isDeploymentAuthEnabled = (deployment: Deployment): boolean =>
  deployment.model.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

export const useDeploymentAuthTokens = (deployment: Deployment): FetchStateObject<SecretKind[]> => {
  const {
    serverSecrets: { data: projectSecrets, loaded, error, refresh },
  } = React.useContext(ProjectDetailsContext);

  const deploymentSecrets = React.useMemo(() => {
    const { serviceAccountName } = getTokenNames(
      deployment.model.metadata.name,
      deployment.model.metadata.namespace,
    );

    return projectSecrets.filter(
      (secret) =>
        secret.metadata.annotations?.['kubernetes.io/service-account.name'] === serviceAccountName,
    );
  }, [projectSecrets, deployment.model.metadata.name, deployment.model.metadata.namespace]);

  return { data: deploymentSecrets, loaded, error, refresh };
};
