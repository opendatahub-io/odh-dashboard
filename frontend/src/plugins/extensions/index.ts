import type { Extension } from '@openshift/dynamic-plugin-sdk';
import hardwareProfileExtensions from './hardware-profiles';
import navigationExtensions from './navigation';
import routeExtensions from './routes';
import modelRegistryLabTuneExtensions from './model-registry-lab-tune';

const extensions: Extension[] = [
  ...navigationExtensions,
  ...hardwareProfileExtensions,
  ...routeExtensions,
  ...modelRegistryLabTuneExtensions,
];

export default extensions;
