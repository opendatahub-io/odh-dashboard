import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const MODEL_AS_SERVICE = 'modelAsService';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE,
      featureFlags: ['modelAsService'],
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
      href: '/maas/tiers',
      section: 'settings',
      path: '/maas/tiers/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      path: '/maas/*',
      component: () => import('./MaaSWrapper'),
    },
  },
];

export default extensions;
