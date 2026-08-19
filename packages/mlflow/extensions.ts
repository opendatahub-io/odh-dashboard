import type { ProjectSelectorExtension } from './frontend/src/odh/extension-points';

const extensions: ProjectSelectorExtension[] = [
  {
    type: 'mlflow.project/selector',
    properties: {
      component: () => import('./src/projectSelector/ProjectSelectorField'),
    },
  },
];

export default extensions;
