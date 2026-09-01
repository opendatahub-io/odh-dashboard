import { FetchOptions, FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { useTemplateOrder as useTemplateOrderBase } from '@odh-dashboard/model-serving/shared';
import { getDashboardConfigTemplateOrder } from '@odh-dashboard/internal/api/k8s/dashboardConfig';
import { getDashboardConfigTemplateOrderBackend } from '@odh-dashboard/internal/services/dashboardService';

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
