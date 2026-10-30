import React from 'react';
import { type APIOptions, type FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import { getIsMaasAdmin } from '~/app/api/k8s';
import { getMaaSWhoAmI } from '~/app/api/whoami';
import { useGridFeatureFlag } from '~/app/utilities/gridFeatureFlag';

type IsMaasAdminResult = {
  allowed: boolean;
};

export const useIsMaasAdmin = (): [boolean, boolean, Error | undefined] => {
  const isGridEnabled = useGridFeatureFlag();
  const callback = React.useCallback<
    FetchStateCallbackPromise<IsMaasAdminResult | { isAdmin: boolean }>
  >(
    (opts: APIOptions) => (isGridEnabled ? getMaaSWhoAmI()(opts) : getIsMaasAdmin()(opts)),
    [isGridEnabled],
  );

  const [result, loaded, error] = useFetchState<IsMaasAdminResult | { isAdmin: boolean }>(
    callback,
    isGridEnabled ? { isAdmin: false } : { allowed: false },
    { initialPromisePurity: true },
  );

  return [
    isGridEnabled ? 'isAdmin' in result && result.isAdmin : 'allowed' in result && result.allowed,
    loaded,
    error,
  ];
};
