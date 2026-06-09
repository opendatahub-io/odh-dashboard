import type {
  AreaExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const AGENT_OPS = 'agent-ops';
const AGENTS_TAB_PAGE = 'agents-tab-page';

const extensions: (AreaExtension | TabRouteTabExtension)[] = [
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
      component: () => import('./AgentDeploymentsWrapper'),
      group: '1_deployments',
    },
  },
];

export default extensions;
