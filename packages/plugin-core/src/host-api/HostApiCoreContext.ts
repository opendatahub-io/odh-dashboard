import * as React from 'react';
import type { HostApiCoreServices } from './types';

const notProvided = (name: string) => () => {
  throw new Error(`HostApiCoreContext not provided: ${name}`);
};

export const HostApiCoreContext = React.createContext<HostApiCoreServices>({
  dashboardNamespace: '',
  checkAccess: notProvided('checkAccess'),
  trackEvent: notProvided('trackEvent'),
  fetchDashboardConfig: notProvided('fetchDashboardConfig'),
});
