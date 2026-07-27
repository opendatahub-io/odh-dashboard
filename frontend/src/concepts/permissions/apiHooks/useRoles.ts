import * as React from 'react';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { listRoles } from '#~/api';
import { RoleKind } from '#~/k8sTypes';

export const useRoles = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<RoleKind[]> => {
  const getRoles = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }
    return listRoles(namespace);
  }, [namespace]);

  return useFetch<RoleKind[]>(getRoles, [], fetchOptions);
};
