import { createDistribution } from '@odh-dashboard/base-distribution';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import K8sSdkProvider from './providers/K8sSdkProvider';
import PortalContextProvider from './providers/PortalContextProvider';
import { PORTAL_BASE_PATH } from './portalPaths';

createDistribution({
  extensions: pluginExtensions,
  featureFlags,
  AppWrapper: PortalContextProvider,
  PluginStoreWrapper: K8sSdkProvider,
  basename: PORTAL_BASE_PATH,
});
