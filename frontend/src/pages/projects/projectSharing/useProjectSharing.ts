import * as React from 'react';
import { listRoleBindings } from '~/api';
import { RoleBindingKind } from '~/k8sTypes';
import useFetch, { FetchOptions, FetchStateObject } from '~/utilities/useFetch';

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
