import React from 'react';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';

export const createHostApiWrapper = (
  trackEvent: HostApiCoreServices['trackEvent'],
): React.FC<React.PropsWithChildren> => {
  const coreApi: HostApiCoreServices = {
    dashboardNamespace: 'opendatahub',
    checkAccess: jest.fn(),
    trackEvent,
    fetchDashboardConfig: jest.fn(),
    fetchClusterSettings: jest.fn(),
    updateClusterSettings: jest.fn(),
  };
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <HostApiCoreContext.Provider value={coreApi}>{children}</HostApiCoreContext.Provider>
  );
  return Wrapper;
};
