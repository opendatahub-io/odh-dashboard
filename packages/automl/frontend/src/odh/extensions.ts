import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const AUTOML = 'automl';
// AutoML requires automl feature flag.

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: AUTOML,
      requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
      featureFlags: ['automl'],
      reliantAreas: [],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [AUTOML],
    },
    properties: {
      id: 'automl-view',
      title: 'AutoML',
      href: '/develop-train/automl',
      section: 'develop-and-train',
      path: '/develop-train/automl/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AUTOML], // Route only available when AutoML feature flag is enabled
    },
    properties: {
      path: '/develop-train/automl/*',
      component: () => import('./AutoMlWrapper'),
    },
  },
];

export default extensions;
