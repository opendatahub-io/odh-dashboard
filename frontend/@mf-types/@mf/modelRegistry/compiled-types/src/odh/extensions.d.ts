import type { NavExtension, RouteExtension, AreaExtension, TabRouteTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { McpServerDeployModalExtension } from './extension-points';
declare const extensions: (NavExtension | RouteExtension | AreaExtension | TabRouteTabExtension | McpServerDeployModalExtension)[];
export default extensions;
