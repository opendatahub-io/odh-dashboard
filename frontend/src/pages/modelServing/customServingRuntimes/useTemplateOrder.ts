import * as React from 'react';
import { getDashboardConfigTemplateOrder } from '~/api';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getDashboardConfigTemplateOrderBackend } from '~/services/dashboardService';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useTemplateOrder = (namespace?: string, adminPanel?: boolean): FetchState<string[]> => {
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const getTemplateOrder = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }

    if (!customServingRuntimesEnabled) {
      return Promise.reject(new NotReadyError('Custom serving runtime is not enabled'));
    }

    // TODO: Remove this when we migrate admin panel to Passthrough API
    if (adminPanel) {
      return getDashboardConfigTemplateOrderBackend(namespace).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Dashboard config template order is not configured.');
        }
        throw e;
      });
    }

    return getDashboardConfigTemplateOrder(namespace).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Dashboard config template order is not configured.');
      }
      throw e;
    });
  }, [namespace, customServingRuntimesEnabled, adminPanel]);

  return useFetchState<string[]>(getTemplateOrder, []);
};

export default useTemplateOrder;
