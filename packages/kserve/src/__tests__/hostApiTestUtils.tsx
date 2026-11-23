import React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent, TrackPageEvent } from '@odh-dashboard/analytics/types';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import {
  NotificationContext,
  type NotificationAPI,
} from '@odh-dashboard/ui-core/contexts/NotificationContext';

type TestProviders = {
  tracking: {
    trackEvent: jest.MockedFunction<TrackEvent>;
    trackPageEvent: jest.MockedFunction<TrackPageEvent>;
  };
  coreApi: HostApiCoreServices;
  notification: jest.Mocked<NotificationAPI>;
  wrapper: React.FC<React.PropsWithChildren>;
};

export const createTestProviders = ({
  dashboardNamespace = 'opendatahub',
}: { dashboardNamespace?: string } = {}): TestProviders => {
  const tracking = {
    trackEvent: jest.fn<ReturnType<TrackEvent>, Parameters<TrackEvent>>(),
    trackPageEvent: jest.fn<ReturnType<TrackPageEvent>, Parameters<TrackPageEvent>>(),
  };
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
    <AnalyticsTrackingProvider value={tracking}>
      <HostApiCoreContext.Provider value={coreApi}>
        <NotificationContext.Provider value={notification}>{children}</NotificationContext.Provider>
      </HostApiCoreContext.Provider>
    </AnalyticsTrackingProvider>
  );

  return { tracking, coreApi, notification, wrapper: Wrapper };
};
