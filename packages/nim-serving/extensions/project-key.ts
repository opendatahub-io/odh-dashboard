import type { ProjectDetailsSettingsCardExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';

/**
 * NIM key management: the NIM API key settings card.
 */
const extensions: ProjectDetailsSettingsCardExtension[] = [
  {
    type: 'app.project-details/settings-card',
    properties: {
      id: 'nim-settings',
      title: 'NVIDIA NIM',
      component: () => import('../src/pages/projectSettings/NIMSettingsCard'),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
];

export default extensions;
