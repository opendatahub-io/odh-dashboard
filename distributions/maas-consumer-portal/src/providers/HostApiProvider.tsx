import * as React from 'react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';

const coreServices: HostApiCoreServices = {
  dashboardNamespace: '',
  checkAccess: (resourceAttributes) => checkAccess(resourceAttributes, { defaultAllowed: false }),
  trackEvent: () => undefined,
  fetchDashboardConfig: () =>
    Promise.reject(new Error('DashboardConfig is not available in the MaaS Consumer Portal.')),
  fetchClusterSettings: () =>
    Promise.reject(new Error('Cluster settings are not available in the MaaS Consumer Portal.')),
  updateClusterSettings: () =>
    Promise.reject(new Error('Cluster settings are not configurable in the MaaS Consumer Portal.')),
};

type HostApiProviderProps = {
  children: React.ReactNode;
};

/** Supplies the core host services needed by bundled portal packages. */
const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => (
  <HostApiCoreContext.Provider value={coreServices}>{children}</HostApiCoreContext.Provider>
);

export default HostApiProvider;
