import type { ProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const projectDetailsTabs: ProjectDetailsTab[] = [
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'model-server', // same value as ProjectSectionID.MODEL_SERVER
      title: 'Models',
      component: () => import('./src/ModelsProjectDetailsTab'),
    },
    flags: {
      required: [SupportedArea.PLUGIN_MODEL_SERVING],
    },
  },
];

const extensions: typeof projectDetailsTabs = [...projectDetailsTabs];

export default extensions;
