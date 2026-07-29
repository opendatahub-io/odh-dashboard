import { FetchOptions, FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { useTemplateOrder as useTemplateOrderBase } from '@odh-dashboard/model-serving/shared';
import { getDashboardConfigTemplateOrder } from '#~/api';
import { getDashboardConfigTemplateOrderBackend } from '#~/services/dashboardService';

const useTemplateOrder = (
  namespace?: string,
  adminPanel?: boolean,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<string[]> => {
  // TODO: Remove backend workaround when we migrate admin panel to Passthrough API
  const fetcher = adminPanel
    ? getDashboardConfigTemplateOrderBackend
    : getDashboardConfigTemplateOrder;

  return useTemplateOrderBase(namespace, fetcher, fetchOptions);
};

export default useTemplateOrder;
