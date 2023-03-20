import * as React from 'react';
import { getInferenceServiceContext } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useInferenceServices = (namespace?: string): FetchState<InferenceServiceKind[]> => {
  const getServingInferences = React.useCallback(
    () => getInferenceServiceContext(namespace, 'opendatahub.io/dashboard=true'),
    [namespace],
  );

  return useFetchState<InferenceServiceKind[]>(getServingInferences, []);
};

export default useInferenceServices;
