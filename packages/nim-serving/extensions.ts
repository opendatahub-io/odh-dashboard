import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: AreaExtension[] = [
  {
    type: 'app.area',
    properties: {
      id: 'nim-wizard',
      featureFlags: ['nimWizard'],
      reliantAreas: ['nim-model'],
    },
  },
];

export default extensions;
