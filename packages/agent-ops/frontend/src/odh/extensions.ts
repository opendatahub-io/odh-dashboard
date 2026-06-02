import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

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
    type: 'app.navigation/section',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      id: 'agent-ops',
      title: 'Agent Ops',
      group: '7_agent_ops_studio',
      iconRef: () => import('./AgentOpsNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      id: 'agent-ops-view',
      title: 'Agent Ops',
      href: '/agent-ops/main-view',
      section: 'agent-ops',
      path: '/agent-ops/main-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/agent-ops/main-view/*',
      component: () => import('./AgentOpsWrapper'),
    },
  },
];

export default extensions;
