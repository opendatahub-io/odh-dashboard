import type {
  AreaExtension,
  ProjectDetailsSettingsCard,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const extensions: (AreaExtension | ProjectDetailsSettingsCard)[] = [
  {
    type: 'app.area',
    properties: {
      id: 'nim-wizard',
      featureFlags: ['nimWizard'],
      reliantAreas: [SupportedArea.NIM_MODEL],
    },
  },
  {
    type: 'app.project-details/settings-card',
    properties: {
      id: 'nim-settings',
      title: 'NVIDIA NIM',
      component: () => import('./src/NIMSettingsCard'),
    },
    flags: {
      required: ['nim-wizard'],
    },
  },
];

export default extensions;
