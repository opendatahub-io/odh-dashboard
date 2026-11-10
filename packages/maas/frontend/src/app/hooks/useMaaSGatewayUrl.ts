import React from 'react';
import {
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
  useFetchState,
} from 'mod-arch-core';
import { getMaaSGatewayUrl } from '~/app/api/gateway';

export const useMaaSGatewayUrl = (): FetchState<string> => {
  const callback = React.useCallback<FetchStateCallbackPromise<string>>(
    (opts: APIOptions) => getMaaSGatewayUrl()(opts).then((result) => result.url),
    [],
  );

  return useFetchState<string>(callback, '');
};
