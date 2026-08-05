import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const AGENT_OPS = 'agent-ops';
const AGENTS_TAB_PAGE = 'agents-tab-page';

const extensions: (AreaExtension | TabRouteTabExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
  {
    type: 'app.area',
    properties: {
      id: 'agent-ops-deploy',
      featureFlags: ['agentOpsDeploy'],
    },
  },
  // --- Existing agent-ops tabs/routes ---
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'deployments',
      title: 'Deployments',
      component: () => import('./AgentDeploymentsWrapper.tsx'),
      group: '1_deployments',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS, 'agent-ops-deploy'],
    },
    properties: {
      path: '/ai-hub/agents/deployments/:namespace/:agentId/*',
      component: () => import('./AgentDeploymentDetailRoutes.tsx'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS, 'agent-ops-deploy'],
    },
    properties: {
      path: '/ai-hub/agents/deployments/deploy',
      component: () => import('./AgentDeployWizardRoutes.tsx'),
    },
  },
  // --- OpenShell Dashboard tabs/routes ---
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'sandboxes',
      title: 'Sandboxes',
      component: () => import('./openshell/SandboxesWrapper'),
      group: '2_sandboxes',
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'workspaces',
      title: 'Workspaces',
      component: () => import('./openshell/WorkspacesWrapper'),
      group: '3_workspaces',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace',
      component: () => import('./openshell/WorkspaceDetailWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace/sandboxes/:sandbox',
      component: () => import('./openshell/SandboxDetailWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace/providers/:provider',
      component: () => import('./openshell/ProviderDetailWrapper'),
    },
  },
];

export default extensions;
