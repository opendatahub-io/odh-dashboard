import * as React from 'react';
import { RoleBindingKind } from '~/k8sTypes';
import { listModelRegistryRoleBindings } from '~/services/modelRegistrySettingsService';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useModelRegistryRoleBindings = (): FetchState<RoleBindingKind[]> => {
  const getRoleBindings = React.useCallback(
    () =>
      listModelRegistryRoleBindings().catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No rolebindings found.');
        }
        throw e;
      }),
    [],
  );

  return useFetchState<RoleBindingKind[]>(getRoleBindings, []);
};

export default useModelRegistryRoleBindings;
