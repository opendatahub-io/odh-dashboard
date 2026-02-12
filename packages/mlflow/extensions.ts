import type {
  AreaExtension,
  HrefNavItemExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

/**
 * MLflow host-side extensions.
 */
const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: 'mlflow-application',
      featureFlags: ['mlflow'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: ['ds-pipelines', 'mlflow-application'],
    },
    properties: {
      id: 'experiments-mlflow',
      title: 'Experiments (MLflow)',
      href: '/develop-train/mlflow/experiments',
      section: 'develop-and-train',
      path: '/develop-train/mlflow/experiments/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.DS_PIPELINES, SupportedArea.MLFLOW],
    },
    properties: {
      path: '/develop-train/mlflow/*',
      component: () => import('./GlobalMLflowExperimentsRoutes'),
    },
  },
];

export default extensions;
