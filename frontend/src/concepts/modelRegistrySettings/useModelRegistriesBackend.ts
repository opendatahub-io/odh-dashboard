import React from 'react';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { ModelRegistryKind } from '#~/k8sTypes';
import { listModelRegistriesBackend } from '#~/services/modelRegistrySettingsService';
import { POLL_INTERVAL } from '#~/utilities/const';

const useModelRegistriesBackend = (): FetchState<ModelRegistryKind[]> => {
  const getModelRegistries = React.useCallback(() => listModelRegistriesBackend(), []);
  return useFetchState<ModelRegistryKind[]>(getModelRegistries, [], { refreshRate: POLL_INTERVAL });
};

export default useModelRegistriesBackend;
