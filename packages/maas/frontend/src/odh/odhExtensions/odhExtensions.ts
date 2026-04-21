import {
  AreaExtension,
  RouteExtension,
  NavExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

export const MODEL_AS_SERVICE_ID = 'modelAsService';
export const MAAS_AUTH_POLICIES = 'maasAuthPolicies';

export type ODHExtensions = NavExtension | RouteExtension | AreaExtension | TaskItemExtension;
const ADMIN_USER = 'ADMIN_USER';
const MODELS_AS_SERVICE_READY = 'ModelsAsServiceReady';

const ODH_EXTENSIONS: ODHExtensions[] = [
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE_ID,
      featureFlags: ['modelAsService'],
      customCondition: ({ dscStatus }) =>
        !!dscStatus?.conditions.some(
          (c) => c.type === MODELS_AS_SERVICE_READY && c.status === 'True',
        ),
    },
  },
  {
    type: 'app.area',
    properties: {
      id: MAAS_AUTH_POLICIES,
      featureFlags: ['maasAuthPolicies'],
      customCondition: ({ dscStatus }) =>
        !!dscStatus?.conditions.some(
          (c) => c.type === MODELS_AS_SERVICE_READY && c.status === 'True',
        ),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER],
    },
    properties: {
      id: 'maas-subscriptions-view',
      title: 'Subscriptions',
      href: '/maas/subscriptions',
      section: 'settings',
      path: '/maas/subscriptions/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER, MAAS_AUTH_POLICIES],
    },
    properties: {
      id: 'maas-auth-policies-view',
      title: 'Authorization policies',
      href: '/maas/auth-policies',
      section: 'settings',
      path: '/maas/auth-policies/*',
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      id: 'gen-ai-studio',
      title: 'Gen AI studio',
      group: '4_gen_ai_studio',
      iconRef: () => import('./GenAiStudioNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      id: 'maas-tokens-view',
      title: 'API keys',
      href: '/maas/tokens',
      section: 'gen-ai-studio',
      path: '/maas/tokens/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER],
    },
    properties: {
      path: '/maas/subscriptions/*',
      component: () => import('./MaaSWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER, MAAS_AUTH_POLICIES],
    },
    properties: {
      path: '/maas/auth-policies/*',
      component: () => import('./MaaSWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      path: '/maas/tokens/*',
      component: () => import('./MaaSWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      path: '/maas',
      component: () => import('./MaaSRedirect'),
    },
  },
  {
    type: 'app.task/item',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      id: 'genai-api-keys',
      group: 'gen-ai-studio',
      title: 'Manage API keys',
      destination: { href: '/maas/tokens' },
      order: '5_api_keys',
    },
  },
];

export default ODH_EXTENSIONS;
