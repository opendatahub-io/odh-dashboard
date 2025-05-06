import type { Extension } from '@openshift/dynamic-plugin-sdk';
import modelServingExtensions from '@odh-dashboard/model-serving';
import navigationExtensions from './extensions/navigation';
import hardwareProfileExtensions from './extensions/hardware-profiles';

const extensions: Extension[] = [
  ...modelServingExtensions,
  ...navigationExtensions,
  ...hardwareProfileExtensions,
];

export default extensions;
