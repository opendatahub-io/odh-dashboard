import { useFetchState, FetchStateCallbackPromise, NotReadyError } from 'mod-arch-core';
import React from 'react';
import { getInferenceServices } from '~/app/api/k8s';
import { InferenceServiceItem, InferenceServicesResponse } from '~/app/types';

type UseInferenceServicesResult = {
  inferenceServices: InferenceServiceItem[];
  loaded: boolean;
  loadError: Error | undefined;
  warning: string | undefined;
};

const EMPTY_RESPONSE: InferenceServicesResponse = { items: [] };

export const useInferenceServices = (namespace: string): UseInferenceServicesResult => {
  const [warning, setWarning] = React.useState<string | undefined>(undefined);

  const fetchInferenceServices = React.useCallback<
    FetchStateCallbackPromise<InferenceServicesResponse>
  >(
    (opts) => {
      if (!namespace) {
        return Promise.reject(
          new NotReadyError('Namespace is required to fetch inference services'),
        );
      }
      return getInferenceServices('', namespace)(opts);
    },
    [namespace],
  );

  const [response, loaded, loadError] = useFetchState<InferenceServicesResponse>(
    fetchInferenceServices,
    EMPTY_RESPONSE,
    { initialPromisePurity: true },
  );

  React.useEffect(() => {
    if (loaded) {
      setWarning(response.warning);
    }
  }, [loaded, response.warning]);

  return {
    inferenceServices: response.items,
    loaded,
    loadError,
    warning,
  };
};
