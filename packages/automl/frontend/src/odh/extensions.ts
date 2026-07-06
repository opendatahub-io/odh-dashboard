import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  AreaExtension,
  NavExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_AUTOML = 'plugin-automl';
// AutoML requires automl feature flag.

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_AUTOML,
      requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
      featureFlags: ['automl'],
      reliantAreas: [],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_AUTOML],
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
      required: [PLUGIN_AUTOML], // Route only available when AutoML feature flag is enabled
    },
    properties: {
      path: '/develop-train/automl/*',
      component: () => import('./AppWrapper'),
    },
  },
];

export default extensions;
