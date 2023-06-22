import * as React from 'react';
import { getDashboardConfigTemplateDisablement } from '~/api';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getDashboardConfigTemplateDisablementBackend } from '~/services/dashboardService';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useTemplateDisablement = (namespace?: string, adminPanel?: boolean): FetchState<string[]> => {
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const getTemplateEnablement = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }

    if (!customServingRuntimesEnabled) {
      return Promise.reject(new NotReadyError('Custom serving runtime is not enabled'));
    }

    // TODO: Remove this when we migrate admin panel to Passthrough API
    if (adminPanel) {
      return getDashboardConfigTemplateDisablementBackend(namespace).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Dashboard config template enablement is not configured.');
        }
        throw e;
      });
    }

    return getDashboardConfigTemplateDisablement(namespace).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Dashboard config template enablement is not configured.');
      }
      throw e;
    });
  }, [namespace, customServingRuntimesEnabled, adminPanel]);

  return useFetchState<string[]>(getTemplateEnablement, []);
};

export default useTemplateDisablement;
