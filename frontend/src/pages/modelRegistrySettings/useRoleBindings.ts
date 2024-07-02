import * as React from 'react';
import { listRoleBindings } from '~/api';
import { RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useRoleBindings = (): FetchState<RoleBindingKind[]> => {
  const getRoleBindings = React.useCallback(
    () =>
      listRoleBindings('odh-model-registries', 'component=model-registry').catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No rolebindings found.');
        }
        throw e;
      }),
    [],
  );

  return useFetchState<RoleBindingKind[]>(getRoleBindings, []);
};

export default useRoleBindings;
