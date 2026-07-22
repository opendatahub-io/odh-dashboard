import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

// Keep in sync with ~/app/utilities/routes.ts (value imports are disallowed in extensions.ts).
const agentDeploymentsPath = '/ai-hub/agents/deployments';
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
      required: [AGENT_OPS],
    },
    properties: {
      path: `${agentDeploymentsPath}/:namespace/:agentId/*`,
      component: () => import('./AgentDeploymentDetailRoutes.tsx'),
    },
  },
  // Wizard route removed — deploy is now a modal (DeploySandboxModal)
];

export default extensions;
