import * as React from 'react';
import { getDashboardConfigTemplateOrder } from '~/api';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useTemplateOrder = (namespace?: string): FetchState<string[]> => {
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const getTemplateOrder = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }

    if (!customServingRuntimesEnabled) {
      return Promise.reject(new NotReadyError('Custom serving runtime is not enabled'));
    }

    return getDashboardConfigTemplateOrder(namespace).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Dashboard config template order is not configured.');
      }
      throw e;
    });
  }, [namespace, customServingRuntimesEnabled]);

  return useFetchState<string[]>(getTemplateOrder, []);
};

export default useTemplateOrder;
