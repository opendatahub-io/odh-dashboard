import * as React from 'react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { PORTAL_BASE_PATH } from '../portalPaths';

const MAAS_WHOAMI_ENDPOINT = `${PORTAL_BASE_PATH}/maas/api/v1/whoami`;

const coreServices: HostApiCoreServices = {
  dashboardNamespace: '',
  checkAccess: (attributes) => {
    if (attributes.group === 'maas.custom' && attributes.resource === 'maas-admin') {
      return fetch(MAAS_WHOAMI_ENDPOINT)
        .then(async (response) => {
          if (!response.ok) {
            return false;
          }
          const body: unknown = await response.json();
          return (
            typeof body === 'object' &&
            body !== null &&
            'data' in body &&
            typeof body.data === 'object' &&
            body.data !== null &&
            'isAdmin' in body.data &&
            body.data.isAdmin === true
          );
        })
        .catch(() => false);
    }
    return checkAccess(attributes, { failureMode: 'reject' }).catch(() => false);
  },
  trackEvent: () => undefined,
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
const HostApiProvider: React.FC<HostApiProviderProps> = ({ children }) => (
  <HostApiCoreContext.Provider value={coreServices}>{children}</HostApiCoreContext.Provider>
);

export default HostApiProvider;
