import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getSubscriptionPolicyFormData } from '~/app/api/subscriptions';
import { SubscriptionPolicyFormDataResponse } from '~/app/types/subscriptions';

const DEFAULT_FORM_DATA: SubscriptionPolicyFormDataResponse = {
  groups: [],
  modelRefs: [],
  subscriptions: [],
  policies: [],
};

export const useSubscriptionPolicyFormData = (): FetchState<SubscriptionPolicyFormDataResponse> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SubscriptionPolicyFormDataResponse>>(
    (opts: APIOptions) => getSubscriptionPolicyFormData()(opts),
    [],
  );

  return useFetchState<SubscriptionPolicyFormDataResponse>(callback, DEFAULT_FORM_DATA, {
    refreshRate: POLL_INTERVAL,
  });
};
