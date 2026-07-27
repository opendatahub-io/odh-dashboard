import { FetchOptions, FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { useTemplateDisablement as useTemplateDisablementBase } from '@odh-dashboard/model-serving/shared';
import { getDashboardConfigTemplateDisablement } from '#~/api';
import { getDashboardConfigTemplateDisablementBackend } from '#~/services/dashboardService';

const useTemplateDisablement = (
  namespace?: string,
  adminPanel?: boolean,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<string[]> => {
  // TODO: Remove backend workaround when we migrate admin panel to Passthrough API
  const fetcher = adminPanel
    ? getDashboardConfigTemplateDisablementBackend
    : getDashboardConfigTemplateDisablement;

  return useTemplateDisablementBase(namespace, fetcher, fetchOptions);
};

export default useTemplateDisablement;
