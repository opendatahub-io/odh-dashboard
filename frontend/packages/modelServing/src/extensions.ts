import type { ProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line import/no-extraneous-dependencies
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const extensions: ProjectDetailsTab[] = [
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'model-server', // same value as ProjectSectionID.MODEL_SERVER
      title: 'Models',
      component: () => import('./components/ModelsProjectDetailsTab'),
    },
    flags: {
      required: [SupportedArea.PLUGIN_MODEL_SERVING],
    },
  },
];

export default extensions;
