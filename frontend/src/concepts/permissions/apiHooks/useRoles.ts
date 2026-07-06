import * as React from 'react';
import { listRoles } from '#~/api';
import { RoleKind } from '#~/k8sTypes';
import useFetch, { FetchOptions, FetchStateObject, NotReadyError } from '#~/utilities/useFetch';

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
