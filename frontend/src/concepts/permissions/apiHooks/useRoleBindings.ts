import * as React from 'react';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { listRoleBindings } from '#~/api';
import { RoleBindingKind } from '#~/k8sTypes';

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
