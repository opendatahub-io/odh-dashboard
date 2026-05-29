import type { NavExtension, RouteExtension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: (NavExtension | RouteExtension)[] = [
  // Navigation section kept commented out, only used for local testing
  // {
  //   type: 'app.navigation/section',
  //   flags: {
  //     required: [MLFLOW],
  //   },
  //   properties: {
  //     id: 'mlflow',
  //     title: 'MLflow',
  //     group: '7_mlflow',
  //     iconRef: () => import('./MlflowNavIcon'),
  //   },
  // },
  // {
  //   type: 'app.navigation/href',
  //   flags: {
  //     required: [MLFLOW],
  //   },
  //   properties: {
  //     id: 'mlflow-view',
  //     title: 'Main Page',
  //     href: '/mlflow-bff/main-view',
  //     section: 'mlflow',
  //     path: '/mlflow-bff/main-view/*',
  //     label: 'Tech Preview',
  //   },
  // },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/mlflow-bff/main-view/*',
      component: () => import('./MlflowWrapper'),
    },
  },
];

export default extensions;
