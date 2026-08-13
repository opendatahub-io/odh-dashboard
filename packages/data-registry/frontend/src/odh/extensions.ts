import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_DATA_REGISTRY = 'plugin-data-registry';

const extensions: (AreaExtension | Extension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_DATA_REGISTRY,
      featureFlags: ['dataRegistry'],
    },
  },
];

export default extensions;
