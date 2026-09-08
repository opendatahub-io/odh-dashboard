import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

// Keep in sync with ~/app/utilities/routes.ts (value imports are disallowed in extensions.ts).
const agentDeploymentsPath = '/ai-hub/agents/deployments';
const agentDeployWizardPath = `${agentDeploymentsPath}/deploy`;
const agentOpsWorkspacesDetailPath = '/ai-hub/agents/workspaces/:workspaceId/*';

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
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'workspaces',
      title: 'Workspaces',
      component: () => import('./WorkspacesWrapper.tsx'),
      group: '1_workspaces',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: agentOpsWorkspacesDetailPath,
      component: () => import('./WorkspacesDetailRoutes.tsx'),
    },
  },
  // Deployments tab and breakout routes stay gated on agentOpsDeploy (hidden until follow-up).
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS, 'agent-ops-deploy'],
    },
    properties: {
      path: `${agentDeploymentsPath}/:namespace/:agentId/*`,
      component: () => import('./AgentDeploymentDetailRoutes.tsx'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS, 'agent-ops-deploy'],
    },
    properties: {
      path: agentDeployWizardPath,
      component: () => import('./AgentDeployWizardRoutes.tsx'),
    },
  },
];

export default extensions;
