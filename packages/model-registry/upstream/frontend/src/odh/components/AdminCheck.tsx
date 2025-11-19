import * as React from 'react';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import { ModelRegistryModel } from '@odh-dashboard/internal/api/models/odh';

type AdminCheckProps = {
  children: (isAdmin: boolean, loaded: boolean) => React.ReactElement;
};

/**
 * ODH-specific admin check component that uses RBAC to determine
 * if the current user can create model registries (admin permission).
 */
const AdminCheck: React.FC<AdminCheckProps> = ({ children }) => {
  const [isAdmin, isAdminLoaded] = useAccessAllowed(
    verbModelAccess('create', ModelRegistryModel),
  );

  return children(isAdmin, isAdminLoaded);
};

export default AdminCheck;

