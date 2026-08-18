import * as React from 'react';
import type { HostApiServices } from './types';

const notProvided = (name: string) => () => {
  throw new Error(`HostApiContext not provided: ${name}`);
};

/**
 * Domain-specific services bridged from the host to federated modules.
 *
 * This is the backward-compatible Domain bridge — the shrinking leftover of the
 * original host API, retained so existing `useHostApi()` consumers keep working.
 * Prefer HostApiCoreContext / HostApiInfraContext for new code; removal of this
 * bridge is tracked by RHOAIENG-79894 / RHOAIENG-79895.
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
