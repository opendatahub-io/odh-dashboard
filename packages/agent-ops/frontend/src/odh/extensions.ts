import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { agentDeploymentsPath, globAgentOpsAll } from '~/app/utilities/routes';

const AGENT_OPS = 'agent-ops';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      id: 'agent-ops-deployments',
      title: 'Agents',
      href: agentDeploymentsPath,
      section: 'ai-hub',
      path: globAgentOpsAll,
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: globAgentOpsAll,
      component: () => import('./AgentOpsWrapper'),
    },
  },
];

export default extensions;
