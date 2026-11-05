import React from 'react';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import {
  NotificationContext,
  type NotificationAPI,
} from '@odh-dashboard/ui-core/contexts/NotificationContext';

type TestProviders = {
  coreApi: HostApiCoreServices;
  trackEvent: jest.MockedFunction<HostApiCoreServices['trackEvent']>;
  notification: jest.Mocked<NotificationAPI>;
  wrapper: React.FC<React.PropsWithChildren>;
};

type TestProviderOptions = {
  dashboardNamespace?: string;
  trackEvent?: HostApiCoreServices['trackEvent'];
};

export const createTestProviders = ({
  dashboardNamespace = 'opendatahub',
  trackEvent: trackEventImplementation,
}: TestProviderOptions = {}): TestProviders => {
  const trackEvent = jest.fn(trackEventImplementation);
  const coreApi: HostApiCoreServices = {
    dashboardNamespace,
    checkAccess: jest.fn(),
    trackEvent,
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

  return { coreApi, trackEvent, notification, wrapper: Wrapper };
};
