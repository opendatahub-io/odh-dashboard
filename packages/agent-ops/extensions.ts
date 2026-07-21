import type { ProjectsBridgeProviderExtension } from './frontend/src/odh/extension-points';

const extensions: ProjectsBridgeProviderExtension[] = [
  {
    type: 'agent-ops.projects/bridge-provider',
    properties: {
      component: () => import('./src/ProjectsBridgeProvider'),
    },
  },
];

export default extensions;
