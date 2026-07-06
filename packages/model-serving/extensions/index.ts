import type { Extension } from '@openshift/dynamic-plugin-sdk';
import odhExtensions from './odh';
import modelRegistryExtensions from './model-registry';
import modelCatalogExtensions from './model-catalog';

const extensions: Extension[] = [
  ...odhExtensions,
  ...modelRegistryExtensions,
  ...modelCatalogExtensions,
];

export default extensions;
