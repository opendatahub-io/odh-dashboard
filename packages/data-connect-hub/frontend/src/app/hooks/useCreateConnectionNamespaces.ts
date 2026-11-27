import React from 'react';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import type { NamespaceKind } from '~/app/types';

export const useCreateConnectionNamespaces = (
  namespaces: NamespaceKind[],
  fetchEnabled = true,
): [NamespaceKind[], boolean, Error | undefined] => {
  const { checkAccess } = useHostApiCore();

  const hasConnectionCreationPrerequisites = React.useCallback(
    async (namespace: string): Promise<boolean> => {
      try {
        const [canCreateConnection, canGetConnectionTypes] = await Promise.all([
          checkAccess({
            group: 'dataconnecthub.opendatahub.io',
            resource: 'data-connections',
            verb: 'create',
            name: '',
            namespace,
            subresource: '',
          }),
          checkAccess({
            group: 'dataconnecthub.opendatahub.io',
            resource: 'data-connection-types',
            verb: 'get',
            name: '',
            namespace,
            subresource: '',
          }),
        ]);
        return canCreateConnection && canGetConnectionTypes;
      } catch {
        return false;
      }
    },
    [checkAccess],
  );

  const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
    async (_opts: APIOptions) => {
      if (!fetchEnabled) {
        return [];
      }

      return Promise.all(
        namespaces.map(async (namespace) => {
          const allowed = await hasConnectionCreationPrerequisites(namespace.name);
          return allowed ? namespace : null;
        }),
      ).then((accessibleNamespaces) =>
        accessibleNamespaces.filter((namespace): namespace is NamespaceKind => namespace !== null),
      );
    },
    [fetchEnabled, hasConnectionCreationPrerequisites, namespaces],
  );

  const [accessibleNamespaces, loaded, error] = useFetchState<NamespaceKind[]>(callback, [], {
    initialPromisePurity: true,
  });

  return [accessibleNamespaces, loaded, error];
};
