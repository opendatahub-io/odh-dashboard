import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { agentDeploymentsPath, globAgentOpsAll } from '~/app/utilities/routes';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.AGENT_OPS],
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
      required: [SupportedArea.AGENT_OPS],
    },
    properties: {
      path: globAgentOpsAll,
      component: () => import('./AgentOpsWrapper'),
    },
  },
];

export default extensions;
