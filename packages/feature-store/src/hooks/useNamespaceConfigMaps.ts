import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import useFetch, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetch';
import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';
import { ConfigMapModel } from '@odh-dashboard/internal/api/models';

const useNamespaceConfigMaps = (
  namespace: string,
): { configMaps: string[]; loaded: boolean; error?: Error } => {
  const fetchConfigMaps = React.useCallback<FetchStateCallbackPromise<string[]>>(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace selected'));
    }
    return k8sListResource<ConfigMapKind>({
      model: ConfigMapModel,
      queryOptions: { ns: namespace },
    }).then((result) => result.items.map((cm) => cm.metadata.name).toSorted());
  }, [namespace]);

  const { data: configMaps, loaded, error } = useFetch(fetchConfigMaps, []);

  return { configMaps, loaded, error };
};

export default useNamespaceConfigMaps;
