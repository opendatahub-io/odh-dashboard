import type { Extension } from '@openshift/dynamic-plugin-sdk';
import navigationExtensions from './navigation';
import routeExtensions from './routes';
import taskExtensions from './tasks';

const extensions: Extension[] = [...navigationExtensions, ...routeExtensions, ...taskExtensions];

export default extensions;
