import pluginExtensions, { featureFlags } from './distribution-extensions';
import ProjectsContextProvider from './context/ProjectsContextProvider';
import { createDistribution } from '../../base/src/lib';

createDistribution({
  extensions: pluginExtensions,
  featureFlags,
  AppWrapper: ProjectsContextProvider,
});
