import * as React from 'react';
import { listRoleBindings } from '~/api';
import { RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useProjectSharing = (namespace?: string): FetchState<RoleBindingKind[]> => {
  const getProjectSharingRoleBidings = React.useCallback(
    () =>
      listRoleBindings(
        namespace,
        'opendatahub.io/dashboard=true,opendatahub.io/project-sharing=true',
      ).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No rolebindings found.');
        }
        throw e;
      }),
    [namespace],
  );

  return useFetchState<RoleBindingKind[]>(getProjectSharingRoleBidings, []);
};

export default useProjectSharing;
