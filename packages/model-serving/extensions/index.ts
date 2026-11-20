import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { modelServingAreas, deploymentRoutes, deploymentMethodFieldExtension } from './deployments';
import {
  projectExtensions,
  legacyRouteExtensions,
  modelCapabilitiesExtensions,
  settingsExtensions,
} from './odh';
import modelRegistryExtensions from './model-registry';
import modelCatalogExtensions from './model-catalog';
import runtimeImageInstallExtensions from './runtime-image-install';

const extensions: Extension[] = [
  ...modelServingAreas,
  ...projectExtensions,
  ...deploymentRoutes,
  ...legacyRouteExtensions,
  deploymentMethodFieldExtension,
  ...modelCapabilitiesExtensions,
  ...settingsExtensions,
  ...modelRegistryExtensions,
  ...modelCatalogExtensions,
  ...runtimeImageInstallExtensions,
];

export default extensions;
