import { fetchOperatorSubscriptionStatus } from '#~/services/operatorSubscriptionStatusService';
import { SubscriptionStatusData } from '#~/types';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';

export const useWatchOperatorSubscriptionStatus = (): FetchState<SubscriptionStatusData | null> =>
  useFetchState<SubscriptionStatusData | null>(fetchOperatorSubscriptionStatus, null);
