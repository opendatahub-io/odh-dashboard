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
      required: ['model-serving-extension'], // same value as SupportedArea.MODEL_SERVING_EXTENSION,
    },
  },
];

export default extensions;
