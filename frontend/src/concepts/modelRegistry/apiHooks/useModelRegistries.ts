import React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { ModelRegistryKind } from '~/k8sTypes';
import { listModelRegistries } from '~/api';

const useModelRegistries = (): FetchState<ModelRegistryKind[]> => {
  const getModelRegistries = React.useCallback(() => listModelRegistries(), []);
  return useFetchState<ModelRegistryKind[]>(getModelRegistries, []);
};

export default useModelRegistries;
