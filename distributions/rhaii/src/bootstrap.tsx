import pluginExtensions, { featureFlags } from './distribution-extensions';
import { createDistribution } from '../../base/src/lib';

createDistribution({
  extensions: pluginExtensions,
  featureFlags,
});
