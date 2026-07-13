import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { ProjectsBridgeProviderExtension } from './frontend/src/odh/extension-points';

const extensions: (ProjectsBridgeProviderExtension | AreaExtension)[] = [
  {
    type: 'agent-ops.projects/bridge-provider',
    properties: {
      component: () => import('./src/ProjectsBridgeProvider'),
    },
  },
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
];

export default extensions;
