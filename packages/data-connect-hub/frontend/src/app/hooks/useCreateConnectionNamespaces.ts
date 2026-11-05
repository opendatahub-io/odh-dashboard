import React from 'react';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import type { NamespaceKind } from '~/app/types';

export const useCreateConnectionNamespaces = (
  namespaces: NamespaceKind[],
  fetchEnabled = true,
): [NamespaceKind[], boolean, Error | undefined] => {
  const { checkAccess } = useHostApiCore();

  const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
    async (_opts: APIOptions) => {
      if (!fetchEnabled) {
        return [];
      }

      return Promise.all(
        namespaces.map(async (namespace) => {
          try {
            const allowed = await checkAccess({
              group: 'dataconnecthub.opendatahub.io',
              resource: 'data-connections',
              verb: 'create',
              name: '',
              namespace: namespace.name,
              subresource: '',
            });
            return allowed ? namespace : null;
          } catch {
            return null;
          }
        }),
      ).then((accessibleNamespaces) =>
        accessibleNamespaces.filter((namespace): namespace is NamespaceKind => namespace !== null),
      );
    },
    [checkAccess, fetchEnabled, namespaces],
  );

  const [accessibleNamespaces, loaded, error] = useFetchState<NamespaceKind[]>(callback, [], {
    initialPromisePurity: true,
  });

  return [accessibleNamespaces, loaded, error];
};
