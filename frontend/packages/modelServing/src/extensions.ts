import type { ProjectDetailsTab } from '@odh-dashboard/plugin-core/extension-points';

const extensions: ProjectDetailsTab[] = [
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'model-server', // same value as ProjectSectionID.MODEL_SERVER
      title: 'Models',
      component: () => import('./components/ModelsProjectDetailsTab'),
    },
    flags: {
      required: ['plugin-model-serving'], // same value as SupportedArea.PLUGIN_MODEL_SERVING,
    },
  },
];

export default extensions;
