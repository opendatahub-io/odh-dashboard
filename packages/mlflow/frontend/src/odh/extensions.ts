import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const MLFLOW = 'mlflow';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: MLFLOW,
      requiredComponents: [],
      featureFlags: ['mlflow'],
    },
  },
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
  //     href: '/mlflow/main-view',
  //     section: 'mlflow',
  //     path: '/mlflow/main-view/*',
  //     label: 'Tech Preview',
  //   },
  // },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/mlflow/main-view/*',
      component: () => import('./MlflowWrapper'),
    },
  },
];

export default extensions;
