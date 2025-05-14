import type { Extension } from '@openshift/dynamic-plugin-sdk';
import modelServingExtensions from '@odh-dashboard/model-serving';
import kserveExtensions from '@odh-dashboard/kserve';
import navigationExtensions from './extensions/navigation';
import hardwareProfileExtensions from './extensions/hardware-profiles';

const extensions: Extension[] = [
  ...modelServingExtensions,
  ...kserveExtensions,
  ...navigationExtensions,
  ...hardwareProfileExtensions,
];

export default extensions;
