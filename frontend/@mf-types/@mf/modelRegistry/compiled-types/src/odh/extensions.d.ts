import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { NavExtension, RouteExtension, AreaExtension, TabRouteTabExtension } from '@odh-dashboard/plugin-core/extension-points';
declare const extensions: (NavExtension | RouteExtension | AreaExtension | TabRouteTabExtension | Extension)[];
export default extensions;
