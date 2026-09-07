import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: AreaExtension[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.PLUGIN_OPENSHELL,
      featureFlags: ['openShell'],
    },
  },
];

export default extensions;
