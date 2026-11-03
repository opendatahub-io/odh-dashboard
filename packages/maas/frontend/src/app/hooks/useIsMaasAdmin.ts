import React from 'react';
import { type APIOptions, type FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import { getMaaSWhoAmI } from '~/app/api/whoami';

export const useIsMaasAdmin = (): [boolean, boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<{ isAdmin: boolean }>>(
    (opts: APIOptions) => getMaaSWhoAmI()(opts),
    [],
  );

  const [result, loaded, error] = useFetchState<{ isAdmin: boolean }>(
    callback,
    { isAdmin: false },
    {
      initialPromisePurity: true,
    },
  );

  return [result.isAdmin, loaded, error];
};
