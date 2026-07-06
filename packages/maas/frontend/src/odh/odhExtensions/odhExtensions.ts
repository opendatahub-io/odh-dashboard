import {
  AreaExtension,
  RouteExtension,
  NavExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

export const MODEL_AS_SERVICE_ID = 'modelAsService';
export const MAAS_AUTH_POLICIES = 'maasAuthPolicies';
export const MAAS_MY_SUBSCRIPTIONS = 'mySubscriptions';
export const MAAS_IA_REDESIGN = 'maasSettingsIaRedesign';

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
    type: 'app.area',
    properties: {
      id: MAAS_MY_SUBSCRIPTIONS,
      featureFlags: ['mySubscriptions'],
    },
  },
  {
    type: 'app.area',
    properties: {
      id: MAAS_IA_REDESIGN,
      featureFlags: ['maasSettingsIaRedesign'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER],
      disallowed: [MAAS_IA_REDESIGN],
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
      disallowed: [MAAS_IA_REDESIGN],
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
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER, MAAS_IA_REDESIGN],
    },
    properties: {
      id: 'maas-subscription-management-view',
      title: 'Subscription management',
      href: '/maas/subscription-management',
      section: 'settings',
      path: '/maas/subscription-management/*',
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
      disallowed: [MAAS_MY_SUBSCRIPTIONS],
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
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, MAAS_MY_SUBSCRIPTIONS],
    },
    properties: {
      id: 'maas-tokens-subscriptions-view',
      title: 'API keys',
      href: '/maas/keys-and-subs',
      section: 'gen-ai-studio',
      path: '/maas/keys-and-subs/*',
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
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER, MAAS_IA_REDESIGN],
    },
    properties: {
      path: '/maas/subscription-management/*',
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
      required: [MODEL_AS_SERVICE_ID, MAAS_MY_SUBSCRIPTIONS],
    },
    properties: {
      path: '/maas/keys-and-subs/*',
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
