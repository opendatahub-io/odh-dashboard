import * as React from 'react';
import type { HostApiServices } from './types';

const notProvided = (name: string) => () => {
  throw new Error(`HostApiContext not provided: ${name}`);
};

/**
 * Domain-specific services bridged from the host to federated modules.
 * These shrink over time as domain logic relocates into owning packages.
 *
 * For core infrastructure (namespace, access, tracking, config) use HostApiCoreContext.
 * For K8s operations (secrets, projects, PVCs) use HostApiInfraContext.
 */
export const HostApiContext = React.createContext<HostApiServices>({
  useTemplates: notProvided('useTemplates'),
  setProjectServingPlatform: notProvided('setProjectServingPlatform'),
  useWatchConnectionTypes: notProvided('useWatchConnectionTypes'),
  useServingConnections: notProvided('useServingConnections'),
  getDashboardConfigTemplateOrder: notProvided('getDashboardConfigTemplateOrder'),
  getDashboardConfigTemplateDisablement: notProvided('getDashboardConfigTemplateDisablement'),
  useModelServingMetrics: notProvided('useModelServingMetrics'),
  useServingPlatformStatuses: notProvided('useServingPlatformStatuses'),
  isProjectNIMSupported: notProvided('isProjectNIMSupported'),
  registeredModelDeploymentsRoute: notProvided('registeredModelDeploymentsRoute'),
});
