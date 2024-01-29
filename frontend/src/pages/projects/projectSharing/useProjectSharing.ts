import * as React from 'react';
import { listRoleBindings } from '~/api';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE, LABEL_SELECTOR_PROJECT_SHARING } from '~/const';
import { RoleBindingKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useProjectSharing = (namespace?: string): FetchState<RoleBindingKind[]> => {
  const getProjectSharingRoleBindings = React.useCallback(
    () =>
      listRoleBindings(
        namespace,
        `${LABEL_SELECTOR_DASHBOARD_RESOURCE},${LABEL_SELECTOR_PROJECT_SHARING}`,
      ).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No rolebindings found.');
        }
        throw e;
      }),
    [namespace],
  );

  return useFetchState<RoleBindingKind[]>(getProjectSharingRoleBindings, []);
};

export default useProjectSharing;
