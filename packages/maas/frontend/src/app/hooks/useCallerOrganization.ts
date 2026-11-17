import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getMaaSWhoAmI } from '~/app/api/whoami';
import type { CallerOrganization } from '~/app/shared/GroupName';

/**
 * The caller's organization from whoami: undefined for a user without one (RHOAI, or no AI grid),
 * and while loading or after a failure, so group names show as they are until it is known.
 */
export const useCallerOrganization = (): FetchState<CallerOrganization | undefined> => {
  const callback = React.useCallback<FetchStateCallbackPromise<CallerOrganization | undefined>>(
    (opts: APIOptions) =>
      getMaaSWhoAmI()(opts).then((whoAmI) =>
        whoAmI.orgId && whoAmI.orgName ? { id: whoAmI.orgId, name: whoAmI.orgName } : undefined,
      ),
    [],
  );
  return useFetchState<CallerOrganization | undefined>(callback, undefined);
};
