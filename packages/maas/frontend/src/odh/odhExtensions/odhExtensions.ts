import {
  AreaExtension,
  RouteExtension,
  NavExtension,
  TaskItemExtension,
  DetailTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

export const MODEL_AS_SERVICE_ID = 'modelAsService';
export const EXTERNAL_MODELS_ID = 'external-models';
export const MAAS_MY_SUBSCRIPTIONS = 'mySubscriptions';

/** Keep in sync with model-serving GlobalModelsPage GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP. */
const GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP = 'model-serving.global-deployments';

export type ODHExtensions =
  | NavExtension
  | RouteExtension
  | AreaExtension
  | TaskItemExtension
  | DetailTabExtension;
const ADMIN_USER = 'ADMIN_USER';
const MODELS_AS_A_SERVICE_READY = 'ModelsAsAServiceReady';

const ODH_EXTENSIONS: ODHExtensions[] = [
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE_ID,
      featureFlags: ['modelAsService'],
      customCondition: ({ dscStatus }) =>
        !!dscStatus?.conditions.some(
          (c) => c.type === MODELS_AS_A_SERVICE_READY && c.status === 'True',
        ),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE_ID, ADMIN_USER],
    },
    properties: {
      id: 'maas-subscription-management-view',
      title: 'MaaS governance',
      href: '/maas/maas-governance',
      section: 'settings',
      path: '/maas/maas-governance/*',
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
      required: [MODEL_AS_SERVICE_ID],
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
      path: '/maas/maas-governance/*',
      component: () => import('./MaaSWrapper'),
    },
  },
  {
    type: 'core.detail/tab',
    flags: {
      required: [MODEL_AS_SERVICE_ID, EXTERNAL_MODELS_ID],
    },
    reliantArea: [MODEL_AS_SERVICE_ID],
    properties: {
      id: 'external-models',
      title: 'External models',
      label: 'Tech Preview',
      group: GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP,
      component: () => import('./ExternalModelsWrapper'),
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
