import React from 'react';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import { type GroupsList } from '~/app/types/auth-groups';
import { getGroups } from '~/app/api/auth';

const DEFAULT_GROUPS: GroupsList = {
  groups: ['system:authenticated'],
};

export const useFetchAuthGroups = (): {
  groups: string[];
  loaded: boolean;
  error: Error | undefined;
} => {
  const callback = React.useCallback<FetchStateCallbackPromise<GroupsList>>(
    (opts: APIOptions) =>
      // If the fetch fails (403, 500, etc.), return empty groups
      getGroups()(opts).catch(() => DEFAULT_GROUPS),
    [],
  );

  const [groupsList, loaded, error] = useFetchState<GroupsList>(callback, DEFAULT_GROUPS);

  return { groups: groupsList.groups, loaded, error };
};
