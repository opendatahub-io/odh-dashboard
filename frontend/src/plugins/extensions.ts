import type { Extension } from '@openshift/dynamic-plugin-sdk';
import navigationExtensions from './extensions/navigation';
import hardwareProfileExtensions from './extensions/hardware-profiles';

const extensions: Extension[] = [...navigationExtensions, ...hardwareProfileExtensions];

export default extensions;
