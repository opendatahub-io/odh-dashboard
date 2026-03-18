import type { Extension } from '@openshift/dynamic-plugin-sdk';
import dashboardConfigExtensions from './dashboard-config';
import hardwareProfileExtensions from './hardware-profiles';
import navigationExtensions from './navigation';
import routeExtensions from './routes';

const extensions: Extension[] = [
  ...dashboardConfigExtensions,
  ...navigationExtensions,
  ...hardwareProfileExtensions,
  ...routeExtensions,
];

export default extensions;
