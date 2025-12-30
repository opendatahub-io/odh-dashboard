import * as React from 'react';
import { listClusterRoles } from '#~/api';
import { ClusterRoleKind } from '#~/k8sTypes';
import useFetch, { FetchOptions, FetchStateObject } from '#~/utilities/useFetch';

export const useClusterRoles = (
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<ClusterRoleKind[]> => {
  const getClusterRoles = React.useCallback(
    () =>
      listClusterRoles().catch((e) => {
        // Many clusters do not grant normal users permissions to list ClusterRoles.
        // For the Permissions tab, this data is optional; treat Forbidden as "no data" (non-blocking).
        if (e.statusObject?.code === 403) {
          return [];
        }
        throw e;
      }),
    [],
  );

  return useFetch<ClusterRoleKind[]>(getClusterRoles, [], fetchOptions);
};
