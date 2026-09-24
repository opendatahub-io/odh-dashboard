import { createDistribution } from '@odh-dashboard/base-distribution';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import PortalContextProvider from './PortalContextProvider';
import { PORTAL_BASE_PATH } from './portalPaths';

createDistribution({
  extensions: pluginExtensions,
  featureFlags,
  AppWrapper: PortalContextProvider,
  basename: PORTAL_BASE_PATH,
});
