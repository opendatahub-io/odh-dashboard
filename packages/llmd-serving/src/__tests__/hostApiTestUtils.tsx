import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent } from '@odh-dashboard/analytics/types';
import React from 'react';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import {
  NotificationContext,
  type NotificationAPI,
} from '@odh-dashboard/ui-core/contexts/NotificationContext';

type TestProviders = {
  coreApi: HostApiCoreServices;
  trackEvent: jest.MockedFunction<TrackEvent>;
  notification: jest.Mocked<NotificationAPI>;
  wrapper: React.FC<React.PropsWithChildren>;
};

type TestProviderOptions = {
  dashboardNamespace?: string;
  trackEvent?: TrackEvent;
};

export const createTestProviders = ({
  dashboardNamespace = 'opendatahub',
  trackEvent: trackEventImplementation,
}: TestProviderOptions = {}): TestProviders => {
  const trackEvent = jest.fn(trackEventImplementation);
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
  const noOp = () => undefined;
  const tracking = { trackEvent, trackPageEvent: noOp };
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <AnalyticsTrackingProvider value={tracking}>
      <HostApiCoreContext.Provider value={coreApi}>
        <NotificationContext.Provider value={notification}>{children}</NotificationContext.Provider>
      </HostApiCoreContext.Provider>
    </AnalyticsTrackingProvider>
  );

  return { coreApi, trackEvent, notification, wrapper: Wrapper };
};
