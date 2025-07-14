import React from 'react';
import { getConfigMap } from '#~/api';
import { ConfigMapKind } from '#~/k8sTypes';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { useLMDashboardNamespace } from '#~/pages/lmEval/utilities/useLMDashboardNamespace';

const useTrustyAIConfigMap = (): FetchStateObject<ConfigMapKind | null> => {
  const { dashboardNamespace } = useLMDashboardNamespace();
  const callback = React.useCallback<FetchStateCallbackPromise<ConfigMapKind | null>>(
    (opts) => getConfigMap(dashboardNamespace, 'trustyai-service-operator-config', opts),
    [dashboardNamespace],
  );
  return useFetch(callback, null);
};

export default useTrustyAIConfigMap;
