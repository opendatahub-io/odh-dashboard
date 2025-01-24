import * as React from 'react';
import { listRoleBindings } from '~/api';
import { RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchOptions, FetchState } from '~/utilities/useFetchState';

const useProjectSharing = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<RoleBindingKind[]> => {
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

  return useFetchState<RoleBindingKind[]>(getProjectSharingRoleBindings, [], fetchOptions);
};

export default useProjectSharing;
