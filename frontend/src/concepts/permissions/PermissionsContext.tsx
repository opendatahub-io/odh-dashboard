import * as React from 'react';
import { ClusterRoleKind, RoleBindingKind, RoleKind } from '#~/k8sTypes';
import { FetchStateObject } from '#~/utilities/useFetch';
import { useClusterRoles } from './apiHooks/useClusterRoles';
import { useRoleBindings } from './apiHooks/useRoleBindings';
import { useRoles } from './apiHooks/useRoles';

export type PermissionsContextType = {
  roles: FetchStateObject<RoleKind[]>;
  clusterRoles: FetchStateObject<ClusterRoleKind[]>;
  roleBindings: FetchStateObject<RoleBindingKind[]>;
  loaded: boolean;
  error: Error | undefined;
};

const PermissionsContext = React.createContext<PermissionsContextType | null>(null);

type PermissionsContextProviderProps = {
  namespace: string;
  children: React.ReactNode;
};

export const PermissionsContextProvider: React.FC<PermissionsContextProviderProps> = ({
  namespace,
  children,
}) => {
  const roles = useRoles(namespace);
  const roleBindings = useRoleBindings(namespace);
  const clusterRoles = useClusterRoles();

  const loaded = roles.loaded && roleBindings.loaded && clusterRoles.loaded;
  const error = roles.error || roleBindings.error || clusterRoles.error;

  const value = React.useMemo<PermissionsContextType>(
    () => ({
      roles,
      clusterRoles,
      roleBindings,
      loaded,
      error,
    }),
    [clusterRoles, error, loaded, roleBindings, roles],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissionsContext = (): PermissionsContextType => {
  const ctx = React.useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissionsContext must be used within a PermissionsContextProvider');
  }
  return ctx;
};
