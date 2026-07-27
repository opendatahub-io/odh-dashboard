import type { Extension } from '@openshift/dynamic-plugin-sdk';
import connectionTypeExtensions from './connection-types';
import navigationExtensions from './navigation';
import routeExtensions from './routes';
import taskExtensions from './tasks';

const extensions: Extension[] = [
  ...connectionTypeExtensions,
  ...navigationExtensions,
  ...routeExtensions,
  ...taskExtensions,
];

export default extensions;
