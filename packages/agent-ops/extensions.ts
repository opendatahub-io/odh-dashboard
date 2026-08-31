import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import type { ProjectsBridgeProviderExtension } from './frontend/src/odh/extension-points';

// The agent-ops UI extensions (tabs, routes) are defined in the INNER
// frontend/src/odh/extensions.ts and delivered via the runtime module-federation
// remote. This outer file must NOT re-declare them or the host renders each tab
// twice (build-time discovery here + runtime remote). Keep only what the host
// needs at build time: the feature-flag area and the projects bridge provider.

const AGENT_OPS = 'agent-ops';

const extensions: (AreaExtension | ProjectsBridgeProviderExtension)[] = [
  {
    type: 'agent-ops.projects/bridge-provider',
    properties: {
      component: () => import('./src/ProjectsBridgeProvider'),
    },
  },
  {
    type: 'app.area',
    properties: {
      id: AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
];

export default extensions;
