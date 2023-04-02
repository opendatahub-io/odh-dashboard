import * as React from 'react';
import { getInferenceServiceContext } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

const useInferenceServices = (namespace?: string): FetchState<InferenceServiceKind[]> => {
  const getServingInferences = React.useCallback(
    () => getInferenceServiceContext(namespace, LABEL_SELECTOR_DASHBOARD_RESOURCE),
    [namespace],
  );

  return useFetchState<InferenceServiceKind[]>(getServingInferences, []);
};

export default useInferenceServices;
