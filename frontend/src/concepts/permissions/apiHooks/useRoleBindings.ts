import * as React from 'react';
import { listRoleBindings } from '#~/api';
import { RoleBindingKind } from '#~/k8sTypes';
import useFetch, { FetchOptions, FetchStateObject, NotReadyError } from '#~/utilities/useFetch';

export const useRoleBindings = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<RoleBindingKind[]> => {
  const getRoleBindings = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }
    return listRoleBindings(namespace);
  }, [namespace]);

  return useFetch<RoleBindingKind[]>(getRoleBindings, [], fetchOptions);
};
