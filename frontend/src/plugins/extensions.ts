import type { Extension } from '@openshift/dynamic-plugin-sdk';
import modelServingExtensions from '@odh-dashboard/model-serving';
import hardwareProfileExtensions from './extensions/hardware-profiles';
import navigationExtensions from './extensions/navigation';
import routeExtensions from './extensions/routes';

const extensions: Extension[] = [
  ...modelServingExtensions,
  ...hardwareProfileExtensions,
  ...navigationExtensions,
  ...routeExtensions,
];

export default extensions;
