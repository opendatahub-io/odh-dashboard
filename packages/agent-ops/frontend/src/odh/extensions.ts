import type { NavExtension, RouteExtension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: (NavExtension | RouteExtension)[] = [
  // Navigation section kept commented out, only used for local testing
  // {
  //   type: 'app.navigation/section',
  //   flags: {
  //     required: [],
  //   },
  //   properties: {
  //     id: 'agent-ops',
  //     title: 'Agent Ops',
  //     group: '8_agent-ops',
  //   },
  // },
  // {
  //   type: 'app.navigation/href',
  //   flags: {
  //     required: [],
  //   },
  //   properties: {
  //     id: 'agent-ops-view',
  //     title: 'Main Page',
  //     href: '/agent-ops-bff/main-view',
  //     section: 'agent-ops',
  //     path: '/agent-ops-bff/main-view/*',
  //     label: 'Tech Preview',
  //   },
  // },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/agent-ops-bff/main-view/*',
      component: () => import('./AgentOpsWrapper'),
    },
  },
];

export default extensions;
