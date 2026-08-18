// Self-contained extensions for the MaaS Consumer Portal distribution.
// Must NOT import from odhExtensions.ts — webpack resolves all import()
// expressions in any imported module, which would pull ExternalModelsWrapper
// into the build graph and re-introduce the model-serving dependency.
// Remove this file once RHOAIENG-79896 fixes the NewProjectButton → API barrel → model-serving chain.
import type {
  AreaExtension,
  HrefNavItemExtension,
  RouteExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const MODEL_AS_SERVICE_ID = 'modelAsService';
const MODELS_AS_A_SERVICE_READY = 'ModelsAsAServiceReady';

type PortalExtensions = RouteExtension | AreaExtension | TaskItemExtension | HrefNavItemExtension;

const PORTAL_EXTENSIONS: PortalExtensions[] = [
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

export default PORTAL_EXTENSIONS;
