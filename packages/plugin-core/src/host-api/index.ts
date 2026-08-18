/* eslint-disable no-barrel-files/no-barrel-files */
// `HostApiContext` / `useHostApi` are the backward-compatible Domain bridge,
// retained until the domain surface is fully migrated (RHOAIENG-79894 /
// RHOAIENG-79895). Prefer the Core and Infra APIs below for new code.
export { HostApiContext } from './HostApiContext';
export { HostApiCoreContext } from './HostApiCoreContext';
export { HostApiInfraContext } from './HostApiInfraContext';
export { useHostApi } from './hooks/useHostApi';
export { useHostApiCore } from './hooks/useHostApiCore';
export { useHostApiInfra } from './hooks/useHostApiInfra';
export { useDashboardNamespace } from './hooks/useDashboardNamespace';
export { useAccessReview } from './hooks/useAccessReview';
export { useTemplates } from './hooks/useTemplates';
export { useSecretOps } from './hooks/useSecretOps';
export { useWatchConnectionTypes } from './hooks/useWatchConnectionTypes';
export { useServingConnections } from './hooks/useServingConnections';
export { useModelServingMetrics } from './hooks/useModelServingMetrics';
export { useServingPlatformStatuses } from './hooks/useServingPlatformStatuses';
export { useIsProjectNIMSupported } from './hooks/useIsProjectNIMSupported';
export { useTrackEvent } from './hooks/useTrackEvent';
export type {
  HostApiCoreServices,
  HostApiInfraServices,
  HostApiServices,
  HostApiFetchState,
  HostApiFetchStateObject,
  K8sWatchResult,
  SecretOps,
  ServingPlatformStatuses,
} from './types';
