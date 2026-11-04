import React from 'react';
import { type APIOptions, type FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import { getIsMaasAdmin } from '~/app/api/k8s';
import { getMaaSWhoAmI } from '~/app/api/whoami';
import { isMaaSPortalHost } from '~/app/utilities/maasGovernanceNavigation';

export const useIsMaasAdmin = (): [boolean, boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<{ isAdmin: boolean }>>(
    (opts: APIOptions) =>
      isMaaSPortalHost()
        ? getMaaSWhoAmI()(opts)
        : getIsMaasAdmin()(opts).then(({ allowed }) => ({ isAdmin: allowed })),
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
