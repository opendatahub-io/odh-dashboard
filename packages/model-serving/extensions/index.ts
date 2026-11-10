import type { Extension } from '@openshift/dynamic-plugin-sdk';
import odhExtensions from './odh';
import modelRegistryExtensions from './model-registry';
import modelCatalogExtensions from './model-catalog';
import runtimeImageInstallExtensions from './runtime-image-install';

const extensions: Extension[] = [
  ...odhExtensions,
  ...modelRegistryExtensions,
  ...modelCatalogExtensions,
  ...runtimeImageInstallExtensions,
];

export default extensions;
