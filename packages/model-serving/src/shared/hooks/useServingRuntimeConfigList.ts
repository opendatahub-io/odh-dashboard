import * as React from 'react';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useServingRuntimeConfigList = (
  namespace: string | undefined,
  fetcher: (namespace: string) => Promise<string[]>,
  errorMessage: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<string[]> => {
  const customServingRuntimesEnabled = useIsAreaAvailable(SupportedArea.CUSTOM_RUNTIMES).status;

  const fetchCallback = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }

    if (!customServingRuntimesEnabled) {
      return Promise.reject(new NotReadyError('Custom serving runtime is not enabled'));
    }

    return fetcher(namespace).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error(errorMessage);
      }
      throw e;
    });
  }, [namespace, customServingRuntimesEnabled, fetcher, errorMessage]);

  return useFetch<string[]>(fetchCallback, [], fetchOptions);
};

export default useServingRuntimeConfigList;
