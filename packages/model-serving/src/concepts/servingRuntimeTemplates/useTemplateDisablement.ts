import * as React from 'react';
import { getDashboardConfigTemplateDisablement } from '@odh-dashboard/internal/api';
import useCustomServingRuntimesEnabled from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getDashboardConfigTemplateDisablementBackend } from '@odh-dashboard/internal/services/dashboardService';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetch';

const useTemplateDisablement = (
  namespace?: string,
  adminPanel?: boolean,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<string[]> => {
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

  return useFetch<string[]>(getTemplateEnablement, [], fetchOptions);
};

export default useTemplateDisablement;
