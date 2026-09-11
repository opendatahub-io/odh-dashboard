import * as React from 'react';
import type { HostApiCoreServices } from './types';

const notProvided = (name: string) => () => {
  throw new Error(`HostApiCoreContext not provided: ${name}`);
};

const notProvidedAsync = (name: string) => () =>
  Promise.reject(new Error(`HostApiCoreContext not provided: ${name}`));

export const HostApiCoreContext = React.createContext<HostApiCoreServices>({
  dashboardNamespace: '',
  checkAccess: notProvided('checkAccess'),
  trackEvent: notProvided('trackEvent'),
  fetchDashboardConfig: notProvidedAsync('fetchDashboardConfig'),
  fetchClusterSettings: notProvidedAsync('fetchClusterSettings'),
  updateClusterSettings: notProvidedAsync('updateClusterSettings'),
});
