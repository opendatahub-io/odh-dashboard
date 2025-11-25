import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line import/no-extraneous-dependencies
//import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';

const MODEL_AS_SERVICE = 'model-as-service';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE,
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      id: 'maas-tiers-view',
      title: 'Tiers',
      href: 'maas/tiers-view',
      section: 'settings',
      path: 'maas/tiers-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      path: '/maas/tiers-view/*',
      component: () => import('./ModArchWrapper'),
    },
  },
];

export default extensions;
