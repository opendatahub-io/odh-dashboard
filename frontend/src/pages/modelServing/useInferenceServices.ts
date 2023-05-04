import * as React from 'react';
import { getInferenceServiceContext } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useInferenceServices = (namespace?: string): FetchState<InferenceServiceKind[]> => {
  const modelServingEnabled = useModelServingEnabled();

  const getServingInferences = React.useCallback(() => {
    if (!modelServingEnabled) {
      return Promise.reject(new NotReadyError('Model serving is not enabled'));
    }

    return getInferenceServiceContext(namespace, 'opendatahub.io/dashboard=true');
  }, [namespace, modelServingEnabled]);

  return useFetchState<InferenceServiceKind[]>(getServingInferences, []);
};

export default useInferenceServices;
