import * as React from 'react';
import { listRoleBindings, listRoles } from '#~/api';
import { RoleBindingKind, RoleKind } from '#~/k8sTypes';
import useFetch, { FetchOptions, FetchStateObject } from '#~/utilities/useFetch';

export const useProjectRoleBindings = (
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

export const useProjectRoles = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<RoleKind[]> => {
  const getProjectRoles = React.useCallback(
    () =>
      listRoles(namespace).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No roles found.');
        }
        throw e;
      }),
    [namespace],
  );

  return useFetch<RoleKind[]>(getProjectRoles, [], fetchOptions);
};
