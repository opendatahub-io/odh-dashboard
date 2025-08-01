import type { Extension } from '@openshift/dynamic-plugin-sdk';
import odhExtensions from './odh';
import modelRegistryExtensions from './model-registry';

const extensions: Extension[] = [...odhExtensions, ...modelRegistryExtensions];

export default extensions;
