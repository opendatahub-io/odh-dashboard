import * as React from 'react';
import type { HostApiServices } from './types';

const notProvided = (name: string) => () => {
  throw new Error(`HostApiContext not provided: ${name}`);
};

/**
 * Shared React context for host-level K8s/OpenShift API services.
 *
 * Main app provides the implementations:
 *   <HostApiContext.Provider value={hostServices}>
 *
 * Federated modules consume via the hooks exported from this module:
 *   const { dashboardNamespace } = useDashboardNamespace();
 *   const [allowed, loaded] = useAccessReview(attrs);
 *   const { getSecretsByLabel } = useHostApi();
 */
export const HostApiContext = React.createContext<HostApiServices>({
  dashboardNamespace: '',
  checkAccess: notProvided('checkAccess'),
  getSecretsByLabel: notProvided('getSecretsByLabel'),
  getDashboardPvcs: notProvided('getDashboardPvcs'),
  fetchDashboardConfig: notProvided('fetchDashboardConfig'),
  useTemplates: notProvided('useTemplates'),
  setProjectServingPlatform: notProvided('setProjectServingPlatform'),
  createSecret: notProvided('createSecret'),
  getSecret: notProvided('getSecret'),
  deleteSecret: notProvided('deleteSecret'),
  patchSecretWithOwnerReference: notProvided('patchSecretWithOwnerReference'),
  patchSecretWithProtocolAnnotation: notProvided('patchSecretWithProtocolAnnotation'),
});
