import type { Extension } from '@openshift/dynamic-plugin-sdk';
import {
  modelServingAreas,
  deploymentRoutes,
  singleModelPlatformExtension,
  deploymentMethodFieldExtension,
} from './deployments';
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
  singleModelPlatformExtension,
  deploymentMethodFieldExtension,
  ...modelCapabilitiesExtensions,
  ...settingsExtensions,
  ...modelRegistryExtensions,
  ...modelCatalogExtensions,
  ...runtimeImageInstallExtensions,
];

export default extensions;
