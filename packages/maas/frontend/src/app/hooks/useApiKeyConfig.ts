import React from 'react';
import {
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
  useFetchState,
} from 'mod-arch-core';
import { getApiKeyConfig } from '~/app/api/api-keys';
import type { APIKeyConfig } from '~/app/types/api-key';

const EMPTY_CONFIG: APIKeyConfig = {
  // eslint-disable-next-line camelcase
  max_expiration_days: 0,
  // eslint-disable-next-line camelcase
  ephemeral_max_expiration: '',
};

export const useApiKeyConfig = (): FetchState<APIKeyConfig> => {
  const callback = React.useCallback<FetchStateCallbackPromise<APIKeyConfig>>(
    (opts: APIOptions) => getApiKeyConfig()(opts),
    [],
  );

  return useFetchState<APIKeyConfig>(callback, EMPTY_CONFIG);
};
