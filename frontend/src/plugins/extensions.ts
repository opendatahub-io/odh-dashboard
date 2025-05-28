import type { Extension } from '@openshift/dynamic-plugin-sdk';
import modelServingExtensions from '@odh-dashboard/model-serving';
import kserveExtensions from '@odh-dashboard/kserve';
import hardwareProfileExtensions from './extensions/hardware-profiles';
import navigationExtensions from './extensions/navigation';
import routeExtensions from './extensions/routes';

const extensions: Extension[] = [
  ...modelServingExtensions,
  ...kserveExtensions,
  ...navigationExtensions,
  ...hardwareProfileExtensions,
  ...routeExtensions,
];

export default extensions;
