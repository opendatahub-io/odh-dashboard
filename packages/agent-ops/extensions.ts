import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import type { ProjectsBridgeProviderExtension } from './frontend/src/odh/extension-points';

const AGENT_OPS = 'agent-ops';
const AGENTS_TAB_PAGE = 'agents-tab-page';

const extensions: (
  | AreaExtension
  | TabRouteTabExtension
  | RouteExtension
  | ProjectsBridgeProviderExtension
)[] = [
  {
    type: 'agent-ops.projects/bridge-provider',
    properties: {
      component: () => import('./src/ProjectsBridgeProvider'),
    },
  },
  {
    type: 'app.area',
    properties: {
      id: AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'deployments',
      title: 'Deployments',
      component: () => import('./frontend/src/odh/openshell/WorkspacesWrapper'),
      group: '1_deployments',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace',
      component: () => import('./frontend/src/odh/openshell/WorkspaceDetailWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace/sandboxes/:sandbox',
      component: () => import('./frontend/src/odh/openshell/SandboxDetailWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace/providers/:provider',
      component: () => import('./frontend/src/odh/openshell/ProviderDetailWrapper'),
    },
  },
];

export default extensions;
