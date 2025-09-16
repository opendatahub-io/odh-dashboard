import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_MODEL_TRAINING = 'plugin-model-training';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_TRAINING,
      reliantAreas: [SupportedArea.MODEL_TRAINING],
      devFlags: ['Model Training Plugin'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_TRAINING],
    },
    properties: {
      id: 'modelTraining',
      title: 'Training jobs',
      section: 'observe-and-monitor',
      href: '/observe-monitor/training-jobs',
      path: '/observe-monitor/training-jobs/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/observe-monitor/training-jobs/*',
      component: () => import('./src/ModelTrainingRoutes'),
    },
    flags: {
      required: [PLUGIN_MODEL_TRAINING],
    },
  },
];

export default extensions;
