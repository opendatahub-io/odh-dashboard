import * as React from 'react';
import { RoleBindingKind } from '#~/k8sTypes';
import { listModelRegistryRoleBindings } from '#~/services/modelRegistrySettingsService';
import { POLL_INTERVAL } from '#~/utilities/const';
import useFetch, { FetchStateObject } from '#~/utilities/useFetch';

const useModelRegistryRoleBindings = (): FetchStateObject<RoleBindingKind[]> => {
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

  return useFetch<RoleBindingKind[]>(getRoleBindings, [], { refreshRate: POLL_INTERVAL });
};

export default useModelRegistryRoleBindings;
