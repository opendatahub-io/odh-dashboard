import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { fetchOperatorSubscriptionStatus } from '#~/services/operatorSubscriptionStatusService';
import { SubscriptionStatusData } from '#~/types';

export const useWatchOperatorSubscriptionStatus = (): FetchState<SubscriptionStatusData | null> =>
  useFetchState<SubscriptionStatusData | null>(fetchOperatorSubscriptionStatus, null);
