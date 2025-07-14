import * as React from 'react';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { getConfigMap } from '#~/api';
import { KSERVE_METRICS_CONFIG_MAP_NAME_SUFFIX } from '#~/concepts/metrics/kserve/const';
import { KserveMetricsConfigMapKind } from '#~/concepts/metrics/kserve/types';
import { isKserveMetricsConfigMapKind } from '#~/concepts/metrics/kserve/utils';

const useKserveMetricsConfigMap = (
  namespace: string,
  modelName: string,
): FetchState<KserveMetricsConfigMapKind | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<KserveMetricsConfigMapKind | null>>(
    (opts) =>
      getConfigMap(namespace, `${modelName}${KSERVE_METRICS_CONFIG_MAP_NAME_SUFFIX}`, opts)
        .then((c) => {
          if (!isKserveMetricsConfigMapKind(c)) {
            return Promise.reject(
              'Received invalid ConfigMap format for kserve metrics definition',
            );
          }
          return c;
        })
        .catch((e) => {
          throw e;
        }),
    [modelName, namespace],
  );

  return useFetchState(callback, null);
};

export default useKserveMetricsConfigMap;
