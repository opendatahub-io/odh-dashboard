import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getSubscriptionFormData } from '~/app/api/subscriptions';
import { SubscriptionFormDataResponse } from '~/app/types/subscriptions';

const DEFAULT_FORM_DATA: SubscriptionFormDataResponse = {
  groups: [],
  modelRefs: [],
  subscriptions: [],
};

export const useSubscriptionFormData = (): FetchState<SubscriptionFormDataResponse> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SubscriptionFormDataResponse>>(
    (opts: APIOptions) => getSubscriptionFormData()(opts),
    [],
  );

  return useFetchState<SubscriptionFormDataResponse>(callback, DEFAULT_FORM_DATA, {
    refreshRate: POLL_INTERVAL,
  });
};
