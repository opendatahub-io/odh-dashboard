import React from 'react';
import { type APIOptions, type FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import { getIsMaasAdmin } from '~/app/api/k8s';

type IsMaasAdminResult = {
  allowed: boolean;
};

export const useIsMaasAdmin = (): [boolean, boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<IsMaasAdminResult>>(
    (opts: APIOptions) => getIsMaasAdmin()(opts),
    [],
  );

  const [result, loaded, error] = useFetchState<IsMaasAdminResult>(callback, { allowed: false });

  return [result.allowed, loaded, error];
};
