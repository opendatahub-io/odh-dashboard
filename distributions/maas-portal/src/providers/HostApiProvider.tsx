import { NoopAnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import * as React from 'react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';

const coreServices: HostApiCoreServices = {
  dashboardNamespace: '',
  checkAccess: (attributes) =>
    checkAccess(attributes, { failureMode: 'reject' }).catch(() => false),
  fetchDashboardConfig: () =>
    Promise.reject(new Error('DashboardConfig is not available in the MaaS Portal.')),
  fetchClusterSettings: () =>
    Promise.reject(new Error('Cluster settings are not available in the MaaS Portal.')),
  updateClusterSettings: () =>
    Promise.reject(new Error('Cluster settings are not configurable in the MaaS Portal.')),
};

type HostApiProviderProps = {
  children: React.ReactNode;
};

/** Supplies the core host services needed by bundled portal packages. */
// Bundled feature routes use tracking hooks; delivery is disabled until the portal integrates Segment.
const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => (
  <NoopAnalyticsTrackingProvider>
    <HostApiCoreContext.Provider value={coreServices}>{children}</HostApiCoreContext.Provider>
  </NoopAnalyticsTrackingProvider>
);

export default HostApiProvider;
