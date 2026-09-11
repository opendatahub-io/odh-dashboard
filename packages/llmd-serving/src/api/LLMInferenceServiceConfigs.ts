import React from 'react';
import useFetch, { FetchStateObject, NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sPatchResource,
  k8sUpdateResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { createPatchesFromDiff, groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { K8sAPIOptions, applyK8sAPIOptions } from '@odh-dashboard/k8s-core';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { CONFIG_TYPE_LABEL } from '../const';
import {
  LLMInferenceServiceConfigModel,
  TopologyType,
  ConfigType,
  type LLMInferenceServiceConfigKind,
} from '../types';
import {
  CONFIG_IN_USE_ERROR_MESSAGE,
  isConfigReferencedInStatus,
  isDeletionPendingDueToReferences,
  type LlmConfigRefType,
} from '../utils';

export class ConfigInUseError extends Error {
  constructor(message = CONFIG_IN_USE_ERROR_MESSAGE) {
    super(message);
    this.name = 'ConfigInUseError';
  }
}

export type DeleteLlmInferenceServiceConfigOutcome = 'deleted' | 'blocked-pending';

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

export const getLLMInferenceServiceConfig = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceConfigKind> =>
  k8sGetResource<LLMInferenceServiceConfigKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceConfigModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const useFetchLLMInferenceServiceConfig = (
  name?: string,
  namespace?: string,
): FetchStateObject<LLMInferenceServiceConfigKind | null> => {
  const fetchCallbackPromise = React.useCallback(
    async (opts: K8sAPIOptions) => {
      if (!name || !namespace) {
        throw new NotReadyError('No config name or namespace');
      }
      return getLLMInferenceServiceConfig(name, namespace, opts).catch((e: unknown) => {
        // If not found, just return `null`
        if (getGenericErrorCode(e) === 404) {
          return null;
        }
        throw e;
      });
    },
    [name, namespace],
  );

  return useFetch(fetchCallbackPromise, null);
};

export const deleteLLMInferenceServiceConfig = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<LLMInferenceServiceConfigKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceConfigModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const deleteLlmInferenceServiceConfigIfUnreferenced = async (
  configName: string,
  namespace: string,
  _refType: LlmConfigRefType,
  opts?: K8sAPIOptions,
): Promise<DeleteLlmInferenceServiceConfigOutcome> => {
  const config = await getLLMInferenceServiceConfig(configName, namespace, opts);

  if (isConfigReferencedInStatus(config)) {
    throw new ConfigInUseError();
  }

  // Kubernetes does not support transactional delete: a new LLMInferenceService referencing
  // this config could be created between the reference check above and the delete below.
  // The KServe llmisvcconfig-finalizer is the backstop for that race; the post-delete
  // isDeletionPendingDueToReferences check surfaces the blocked state in the UI.
  const result = await k8sDeleteResource<LLMInferenceServiceConfigKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceConfigModel,
        queryOptions: { name: configName, ns: namespace },
      },
      opts,
    ),
  );

  if (isDeletionPendingDueToReferences(result)) {
    return 'blocked-pending';
  }

  // Delete may return a Status object instead of the updated resource; re-fetch to detect
  // a terminating config blocked by the KServe finalizer while still referenced.
  // Only treat 404 as "gone"; propagate any other error (5xx, network, etc.).
  const refreshedConfig = await getLLMInferenceServiceConfig(configName, namespace, opts).catch(
    (e: unknown) => {
      if (getGenericErrorCode(e) === 404) {
        return null;
      }
      throw e;
    },
  );
  if (refreshedConfig && isDeletionPendingDueToReferences(refreshedConfig)) {
    return 'blocked-pending';
  }

  return 'deleted';
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
        labelSelector: `${CONFIG_TYPE_LABEL}=${ConfigType.ACCELERATOR}`,
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
  matchLabels?: Record<string, string>,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<LLMInferenceServiceConfigKind[]> => {
  return useK8sWatchResourceList<LLMInferenceServiceConfigKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(LLMInferenceServiceConfigModel),
      namespace,
      ...(matchLabels && {
        selector: {
          matchLabels,
        },
      }),
    },
    LLMInferenceServiceConfigModel,
    opts,
  );
};

// --- Topology Configuration APIs ---

const TOPOLOGY_TYPE_VALUES = Object.values(TopologyType);
const TOPOLOGY_LABEL_SELECTOR = `${CONFIG_TYPE_LABEL} in (${TOPOLOGY_TYPE_VALUES.join(',')})`;

export const listTopologyConfigs = async (
  namespace: string,
  topologyType: TopologyType,
): Promise<LLMInferenceServiceConfigKind[]> => {
  return k8sListResourceItems<LLMInferenceServiceConfigKind>({
    model: LLMInferenceServiceConfigModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        labelSelector: `${CONFIG_TYPE_LABEL}=${topologyType}`,
      },
    },
  });
};

export const listAllTopologyConfigs = async (
  namespace: string,
): Promise<LLMInferenceServiceConfigKind[]> => {
  return k8sListResourceItems<LLMInferenceServiceConfigKind>({
    model: LLMInferenceServiceConfigModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        labelSelector: TOPOLOGY_LABEL_SELECTOR,
      },
    },
  });
};

export const useFetchTopologyConfigs = (
  namespace: string,
): FetchStateObject<LLMInferenceServiceConfigKind[]> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    return listAllTopologyConfigs(namespace);
  }, [namespace]);

  return useFetch(fetchCallbackPromise, []);
};

export const useWatchTopologyConfigs = (
  namespace: string,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<LLMInferenceServiceConfigKind[]> => {
  return useK8sWatchResourceList<LLMInferenceServiceConfigKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(LLMInferenceServiceConfigModel),
      namespace,
      selector: {
        matchExpressions: [
          {
            key: CONFIG_TYPE_LABEL,
            operator: 'In',
            values: TOPOLOGY_TYPE_VALUES,
          },
        ],
      },
    },
    LLMInferenceServiceConfigModel,
    opts,
  );
};

// --- Router Configuration APIs ---

export const listRouterConfigs = async (
  namespace: string,
): Promise<LLMInferenceServiceConfigKind[]> => {
  return k8sListResourceItems<LLMInferenceServiceConfigKind>({
    model: LLMInferenceServiceConfigModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        labelSelector: `${CONFIG_TYPE_LABEL}=${ConfigType.ROUTER}`,
      },
    },
  });
};

export const useFetchRouterConfigs = (
  namespace: string,
): FetchStateObject<LLMInferenceServiceConfigKind[]> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    return listRouterConfigs(namespace);
  }, [namespace]);

  return useFetch(fetchCallbackPromise, []);
};

export const useWatchRouterConfigs = (
  namespace: string,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<LLMInferenceServiceConfigKind[]> => {
  return useK8sWatchResourceList<LLMInferenceServiceConfigKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(LLMInferenceServiceConfigModel),
      namespace,
      selector: {
        matchLabels: {
          [CONFIG_TYPE_LABEL]: ConfigType.ROUTER,
        },
      },
    },
    LLMInferenceServiceConfigModel,
    opts,
  );
};
