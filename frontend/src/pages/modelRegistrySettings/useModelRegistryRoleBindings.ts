import * as React from 'react';
import { listRoleBindings } from '~/api';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';
import { KnownLabels, RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useModelRegistryRoleBindings = (): FetchState<RoleBindingKind[]> => {
  const getRoleBindings = React.useCallback(
    () =>
      listRoleBindings(
        MODEL_REGISTRY_DEFAULT_NAMESPACE,
        KnownLabels.LABEL_SELECTOR_MODEL_REGISTRY,
      ).catch((e) => {
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
