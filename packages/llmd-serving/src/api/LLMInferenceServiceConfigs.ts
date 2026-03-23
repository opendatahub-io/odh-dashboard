import React from 'react';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { LLMInferenceServiceConfigModel, type LLMInferenceServiceConfigKind } from '../types';

/**
 * @returns Template versions of the LLMInferenceServiceConfigKind[] (filtered on 'opendatahub.io/config-type=accelerator')
 */
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

/**
 * @returns Template versions of the LLMInferenceServiceConfigKind[] (filtered on 'opendatahub.io/config-type=accelerator')
 */
export const useFetchLLMInferenceServiceConfigs = (
  namespace: string,
): FetchStateObject<LLMInferenceServiceConfigKind[]> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    return listLLMInferenceServiceConfigs(namespace);
  }, [namespace]);

  return useFetch(fetchCallbackPromise, []);
};

export const useWatchLLMInferenceServiceConfigs = (
  namespace: string,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<LLMInferenceServiceConfigKind[]> => {
  return useK8sWatchResourceList<LLMInferenceServiceConfigKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(LLMInferenceServiceConfigModel),
      namespace,
    },
    LLMInferenceServiceConfigModel,
    opts,
  );
};
