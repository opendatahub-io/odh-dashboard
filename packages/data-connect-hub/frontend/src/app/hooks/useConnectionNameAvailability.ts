import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnectionNameAvailability } from '~/app/api/dch';
import type { ConnectionNameAvailability } from '~/app/types';

const NAME_CHECK_DEBOUNCE_MS = 500;

export const useConnectionNameAvailability = (
  namespace: string,
  name: string,
  fetchEnabled: boolean,
): [ConnectionNameAvailability | undefined, boolean, Error | undefined] => {
  const [debouncedName, setDebouncedName] = React.useState('');

  React.useEffect(() => {
    if (!fetchEnabled || !name) {
      setDebouncedName('');
      return;
    }
    const timeout = globalThis.setTimeout(() => setDebouncedName(name), NAME_CHECK_DEBOUNCE_MS);
    return () => globalThis.clearTimeout(timeout);
  }, [fetchEnabled, name]);

  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionNameAvailability>>(
    async (opts: APIOptions) => {
      if (!fetchEnabled || !debouncedName) {
        return { available: true, conflicts_with: [] };
      }
      return getConnectionNameAvailability('')(opts, namespace, debouncedName);
    },
    [debouncedName, fetchEnabled, namespace],
  );

  const [availability, loaded, error] = useFetchState<ConnectionNameAvailability>(
    callback,
    { available: true, conflicts_with: [] },
    { initialPromisePurity: true },
  );
  const isCheckingCurrentName = fetchEnabled && Boolean(name) && debouncedName === name;

  return [
    isCheckingCurrentName ? availability : undefined,
    isCheckingCurrentName ? loaded : false,
    isCheckingCurrentName ? error : undefined,
  ];
};
