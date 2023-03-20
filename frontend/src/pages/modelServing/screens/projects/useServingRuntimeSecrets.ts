import * as React from 'react';
import { getSecretsByLabel } from '~/api';
import { SecretKind } from '~/k8sTypes';
import { getModelServiceAccountName } from '~/pages/modelServing/utils';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useServingRuntimeSecrets = (namespace?: string): FetchState<SecretKind[]> => {
  const fetchSecrets = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getSecretsByLabel('opendatahub.io/dashboard=true', namespace).then((secrets) =>
      secrets.filter(
        (secret) =>
          secret.metadata.annotations?.['kubernetes.io/service-account.name'] ===
          getModelServiceAccountName(namespace),
      ),
    );
  }, [namespace]);

  return useFetchState<SecretKind[]>(fetchSecrets, []);
};

export default useServingRuntimeSecrets;
