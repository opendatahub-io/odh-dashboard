import * as React from 'react';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useTemplateDisablement = (
  namespace: string | undefined,
  fetcher: (namespace: string) => Promise<string[]>,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<string[]> => {
  const customServingRuntimesEnabled = useIsAreaAvailable(SupportedArea.CUSTOM_RUNTIMES).status;

  const getTemplateEnablement = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }

    if (!customServingRuntimesEnabled) {
      return Promise.reject(new NotReadyError('Custom serving runtime is not enabled'));
    }

    return fetcher(namespace).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Dashboard config template enablement is not configured.');
      }
      throw e;
    });
  }, [namespace, customServingRuntimesEnabled, fetcher]);

  return useFetch<string[]>(getTemplateEnablement, [], fetchOptions);
};

export default useTemplateDisablement;
