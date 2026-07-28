import * as React from 'react';
import useFetch, { FetchOptions, FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { listRoleBindings } from '#~/api';
import { RoleBindingKind } from '#~/k8sTypes';

const useProjectSharing = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<RoleBindingKind[]> => {
  const getProjectSharingRoleBindings = React.useCallback(
    () =>
      listRoleBindings(namespace).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No rolebindings found.');
        }
        throw e;
      }),
    [namespace],
  );

  return useFetch<RoleBindingKind[]>(getProjectSharingRoleBindings, [], fetchOptions);
};

export default useProjectSharing;
