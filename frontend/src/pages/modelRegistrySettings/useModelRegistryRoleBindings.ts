import * as React from 'react';
import { listRoleBindings } from '~/api';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { KnownLabels, RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useModelRegistryRoleBindings = (): FetchState<RoleBindingKind[]> => {
  const { dscStatus } = React.useContext(AreaContext);

  const getRoleBindings = React.useCallback(
    () =>
      listRoleBindings(
        dscStatus?.components?.modelregistry?.registriesNamespace,
        KnownLabels.LABEL_SELECTOR_MODEL_REGISTRY,
      ).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No rolebindings found.');
        }
        throw e;
      }),
    [dscStatus?.components?.modelregistry?.registriesNamespace],
  );

  return useFetchState<RoleBindingKind[]>(getRoleBindings, []);
};

export default useModelRegistryRoleBindings;
