import * as React from 'react';
import type { K8sResourceCommon, K8sAPIOptions, K8sWatchResult } from '@odh-dashboard/k8s-core';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { watchDeploymentList } from './watchDeploymentList';

const empty: never[] = [];

export const useDeploymentWatch = <T extends K8sResourceCommon>(
  model: K8sModelCommon,
  namespace: string | undefined,
  opts?: K8sAPIOptions,
  labelSelectors?: Record<string, string>,
): K8sWatchResult<T[]> => {
  const { watchFetch, discoveryAttempt } = useHostApiCore().deploymentApi ?? {};
  const target = useDeepCompareMemoize({ model, namespace, labelSelectors });
  const sdkResource = React.useMemo(
    () =>
      !watchFetch && target.namespace
        ? {
            isList: true,
            groupVersionKind: groupVersionKind(target.model),
            namespace: target.namespace,
            ...(target.labelSelectors && { selector: { matchLabels: target.labelSelectors } }),
          }
        : null,
    [target, watchFetch],
  );
  const sdkResult = useK8sWatchResourceList<T[]>(sdkResource, model, opts);
  const externalSignal = opts?.signal;
  const request = React.useMemo(
    () => ({ target, watchFetch, externalSignal, discoveryAttempt }),
    [target, watchFetch, externalSignal, discoveryAttempt],
  );
  const [httpState, setHttpState] = React.useState<{
    request: typeof request;
    result: K8sWatchResult<T[]>;
  }>();

  React.useEffect(() => {
    const { target: resource, watchFetch: fetchK8s, externalSignal: parentSignal } = request;
    if (!fetchK8s || !resource.namespace) {
      return undefined;
    }
    const controller = new AbortController();
    const signal = parentSignal
      ? AbortSignal.any([controller.signal, parentSignal])
      : controller.signal;
    void watchDeploymentList<T>(
      fetchK8s,
      resource.model,
      resource.namespace,
      resource.labelSelectors,
      signal,
      (result) => setHttpState({ request, result }),
    );
    return () => controller.abort();
  }, [request]);

  if (!watchFetch) {
    return sdkResult;
  }
  if (httpState?.request === request) {
    return httpState.result;
  }
  return [empty, namespace === undefined, undefined];
};
