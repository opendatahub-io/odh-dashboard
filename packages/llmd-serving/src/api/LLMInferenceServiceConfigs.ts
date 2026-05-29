import React from 'react';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import {
  k8sCreateResource,
  k8sListResourceItems,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { createPatchesFromDiff, groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { LLMInferenceServiceConfigModel, type LLMInferenceServiceConfigKind } from '../types';

export const createLLMInferenceServiceConfig = (
  llmInferenceServiceConfig: LLMInferenceServiceConfigKind,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceConfigKind> => {
  return k8sCreateResource<LLMInferenceServiceConfigKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceConfigModel,
        resource: llmInferenceServiceConfig,
      },
      opts,
    ),
  );
};

export const updateLLMInferenceServiceConfig = (
  llmInferenceServiceConfig: LLMInferenceServiceConfigKind,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceConfigKind> => {
  return k8sUpdateResource<LLMInferenceServiceConfigKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceConfigModel,
        resource: llmInferenceServiceConfig,
      },
      opts,
    ),
  );
};

export const patchLLMInferenceServiceConfig = (
  existingLLMInferenceServiceConfig: LLMInferenceServiceConfigKind,
  newLLMInferenceServiceConfig: LLMInferenceServiceConfigKind,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceConfigKind> => {
  // Generate patches based on the differences
  // Managed fields like status, resourceVersion, etc. are automatically filtered out
  const patches = createPatchesFromDiff(
    existingLLMInferenceServiceConfig,
    newLLMInferenceServiceConfig,
  );

  // If no patches needed, return the existing resource
  if (patches.length === 0) {
    return Promise.resolve(newLLMInferenceServiceConfig);
  }

  return k8sPatchResource<LLMInferenceServiceConfigKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceConfigModel,
        queryOptions: {
          name: newLLMInferenceServiceConfig.metadata.name,
          ns: newLLMInferenceServiceConfig.metadata.namespace,
        },
        patches,
      },
      opts,
    ),
  );
};

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
