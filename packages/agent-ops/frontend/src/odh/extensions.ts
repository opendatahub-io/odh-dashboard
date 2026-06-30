import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { agentDeploymentsPath } from '~/app/utilities/routes';

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
      component: () => import('./AgentDeploymentsWrapper'),
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
      component: () => import('./AgentDeploymentDetailWrapper'),
    },
  },
];

export default extensions;
