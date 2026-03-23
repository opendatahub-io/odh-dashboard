import React from 'react';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { LLMInferenceServiceConfigModel, type LLMInferenceServiceConfigKind } from '../types';

export const listLLMInferenceServiceConfigs = async (
  namespace: string,
): Promise<LLMInferenceServiceConfigKind[]> => {
  return k8sListResourceItems<LLMInferenceServiceConfigKind>({
    model: LLMInferenceServiceConfigModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        labelSelector: 'opendatahub.io/config-type=accelerator',
      },
    },
  });
};

export const useFetchLLMInferenceServiceConfigs = (
  namespace: string,
): FetchStateObject<LLMInferenceServiceConfigKind[]> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    return listLLMInferenceServiceConfigs(namespace);
  }, [namespace]);

  return useFetch(fetchCallbackPromise, []);
};
