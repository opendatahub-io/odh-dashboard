import React from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';

const MaaSRedirect: React.FC = () => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  const isMySubscriptionsEnabled = !!dashboardConfig?.dashboardConfig.mySubscriptions;

  return (
    <Navigate to={isMySubscriptionsEnabled ? '/maas/keys-and-subs' : '/maas/tokens'} replace />
  );
};

export default MaaSRedirect;
