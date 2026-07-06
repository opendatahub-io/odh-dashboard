import type { Extension } from '@openshift/dynamic-plugin-sdk';
import hardwareProfileExtensions from './hardware-profiles';
import navigationExtensions from './navigation';
import routeExtensions from './routes';
import taskExtensions from './tasks';

const extensions: Extension[] = [
  ...navigationExtensions,
  ...hardwareProfileExtensions,
  ...routeExtensions,
  ...taskExtensions,
];

export default extensions;
