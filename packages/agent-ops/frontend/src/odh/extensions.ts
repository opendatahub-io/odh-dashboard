import type { NavExtension, RouteExtension } from '@odh-dashboard/plugin-core/extension-points';

const AGENT_OPS = 'agentOps';

const extensions: (NavExtension | RouteExtension)[] = [
  {
    type: 'app.navigation/href',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      id: 'agent-ops-my-agents',
      title: 'My Agents',
      href: '/agent-ops-bff/main-view',
      section: 'gen-ai-studio',
      path: '/agent-ops-bff/main-view/*',
      label: 'WIP',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/agent-ops-bff/main-view/*',
      component: () => import('./AgentOpsWrapper'),
    },
  },
];

export default extensions;
