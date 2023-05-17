import * as React from 'react';
import { listRoleBindings } from '~/api';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE, LABEL_SELECTOR_PROJECT_SHARING } from '~/const';
import { RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { castProjectSharingRoleType } from './utils';

const useProjectSharing = (namespace?: string): FetchState<RoleBindingKind[]> => {
  const getProjectSharingRoleBindings = React.useCallback(
    () =>
      listRoleBindings(
        namespace,
        `${LABEL_SELECTOR_DASHBOARD_RESOURCE},${LABEL_SELECTOR_PROJECT_SHARING}`,
      )
        .catch((e) => {
          if (e.statusObject?.code === 404) {
            throw new Error('No rolebindings found.');
          }
          throw e;
        })
        .then((roleBindings) =>
          roleBindings.filter((roleBinding) =>
            castProjectSharingRoleType(roleBinding.roleRef.name),
          ),
        ),
    [namespace],
  );

  return useFetchState<RoleBindingKind[]>(getProjectSharingRoleBindings, []);
};

export default useProjectSharing;
