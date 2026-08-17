import { createDistribution } from '@odh-dashboard/base-distribution';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import { applyExtensionOverrides } from './extensionOverrides';
import PortalContextProvider from './PortalContextProvider';

createDistribution({
  extensions: applyExtensionOverrides(pluginExtensions),
  featureFlags,
  AppWrapper: PortalContextProvider,
});
