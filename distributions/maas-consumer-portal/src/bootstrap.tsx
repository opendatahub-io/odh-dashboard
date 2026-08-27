import { createDistribution } from '@odh-dashboard/base-distribution';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import PortalContextProvider from './PortalContextProvider';

createDistribution({
  extensions: pluginExtensions,
  featureFlags,
  AppWrapper: PortalContextProvider,
});
