import React from 'react';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import {
  NotificationContext,
  type NotificationAPI,
} from '@odh-dashboard/ui-core/contexts/NotificationContext';

type TestProviders = {
  coreApi: HostApiCoreServices;
  notification: jest.Mocked<NotificationAPI>;
  wrapper: React.FC<React.PropsWithChildren>;
};

export const createTestProviders = ({
  dashboardNamespace = 'opendatahub',
}: { dashboardNamespace?: string } = {}): TestProviders => {
  const coreApi: HostApiCoreServices = {
    dashboardNamespace,
    checkAccess: jest.fn(),
    fetchDashboardConfig: jest.fn(),
    fetchClusterSettings: jest.fn(),
    updateClusterSettings: jest.fn(),
  };
  const notification = {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  } satisfies NotificationAPI;
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <HostApiCoreContext.Provider value={coreApi}>
      <NotificationContext.Provider value={notification}>{children}</NotificationContext.Provider>
    </HostApiCoreContext.Provider>
  );

  return { coreApi, notification, wrapper: Wrapper };
};
