import * as React from 'react';
import { getSecretsByLabel } from '~/api';
import { SecretKind } from '~/k8sTypes';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

const useServingRuntimeSecrets = (namespace?: string): FetchState<SecretKind[]> => {
  const modelServingEnabled = useModelServingEnabled();

  const fetchSecrets = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    if (!modelServingEnabled) {
      return Promise.reject(new NotReadyError('Model serving is not enabled'));
    }

    return getSecretsByLabel(LABEL_SELECTOR_DASHBOARD_RESOURCE, namespace);
  }, [namespace, modelServingEnabled]);

  return useFetchState<SecretKind[]>(fetchSecrets, []);
};

export default useServingRuntimeSecrets;
