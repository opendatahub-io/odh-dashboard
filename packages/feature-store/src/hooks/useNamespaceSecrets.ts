import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import useFetch, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetch';
import { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { SecretModel } from '@odh-dashboard/internal/api/models';

const useNamespaceSecrets = (
  namespace: string,
): { secrets: string[]; loaded: boolean; error?: Error } => {
  const fetchSecrets = React.useCallback<FetchStateCallbackPromise<string[]>>(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace selected'));
    }
    return k8sListResource<SecretKind>({
      model: SecretModel,
      queryOptions: { ns: namespace },
    }).then((result) => result.items.map((s) => s.metadata.name).toSorted());
  }, [namespace]);

  const { data: secrets, loaded, error } = useFetch(fetchSecrets, []);

  return { secrets, loaded, error };
};

export default useNamespaceSecrets;
