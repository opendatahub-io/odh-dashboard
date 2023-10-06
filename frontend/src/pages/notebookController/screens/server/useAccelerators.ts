import React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { AcceleratorKind } from '~/k8sTypes';
import { listAccelerators } from '~/api';

const useAccelerators = (namespace: string): FetchState<AcceleratorKind[]> => {
  const getAccelerators = React.useCallback(() => listAccelerators(namespace), [namespace]);
  return useFetchState<AcceleratorKind[]>(getAccelerators, []);
};

export default useAccelerators;
