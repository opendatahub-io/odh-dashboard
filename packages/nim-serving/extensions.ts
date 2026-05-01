import type {
  AreaExtension,
  ProjectDetailsSettingsCardExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const extensions: (AreaExtension | ProjectDetailsSettingsCardExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.NIM_WIZARD,
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
      required: [SupportedArea.NIM_WIZARD],
    },
  },
];

export default extensions;
