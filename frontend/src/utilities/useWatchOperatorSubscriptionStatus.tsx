import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import {
  fetchOperatorSubscriptionStatus,
  type OperatorSubscriptionStatus,
} from '@odh-dashboard/k8s-core';

export const useWatchOperatorSubscriptionStatus =
  (): FetchState<OperatorSubscriptionStatus | null> =>
    useFetchState<OperatorSubscriptionStatus | null>(() => fetchOperatorSubscriptionStatus(), null);
