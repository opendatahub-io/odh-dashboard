import {
  AreaExtension,
  RouteExtension,
  NavExtension,
} from '@odh-dashboard/plugin-core/extension-points';

export const MODEL_AS_SERVICE_ID = 'modelAsService';
export const MAAS_API_KEYS_ID = 'maasApiKeys';

export type ODHExtensions = NavExtension | RouteExtension | AreaExtension;
const ADMIN_USER = 'ADMIN_USER';

const ODH_EXTENSIONS: ODHExtensions[] = [
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE_ID,
      featureFlags: ['modelAsService'],
    },
  },
  {
    type: 'app.area',
    properties: {
      id: MAAS_API_KEYS_ID,
      reliantAreas: [MODEL_AS_SERVICE_ID],
      featureFlags: ['maasApiKeys'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER],
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
    type: 'app.navigation/href',
    flags: {
      required: [MAAS_API_KEYS_ID],
    },
    properties: {
      id: 'maas-tokens-view',
      title: 'API keys',
      href: '/maas/tokens',
      section: 'gen-ai-studio',
      path: '/maas/tokens/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER],
    },
    properties: {
      path: '/maas/tiers/*',
      component: () => import('./MaaSWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MAAS_API_KEYS_ID],
    },
    properties: {
      path: '/maas/tokens/*',
      component: () => import('./MaaSWrapper'),
    },
  },
];

export default ODH_EXTENSIONS;
