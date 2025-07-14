import React from 'react';
import useFetchState, { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { ListConfigSecretsResponse } from '#~/k8sTypes';
import { listModelRegistryCertificateNames } from '#~/services/modelRegistrySettingsService';

const useModelRegistryCertificateNames = (
  isDisabled?: boolean,
): FetchState<ListConfigSecretsResponse> => {
  const fetchData = React.useCallback(() => {
    if (isDisabled) {
      return Promise.reject(new NotReadyError('Model registry certificate names is disabled'));
    }

    return listModelRegistryCertificateNames();
  }, [isDisabled]);

  return useFetchState(fetchData, {
    secrets: [],
    configMaps: [],
  });
};

export default useModelRegistryCertificateNames;
