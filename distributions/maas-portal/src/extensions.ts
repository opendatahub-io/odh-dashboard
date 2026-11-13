import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  RouteExtension,
  MastheadToolbarItemExtension,
  SuppressExtension,
  PatchExtension,
  NavPatch,
  HrefNavItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

// Keep in sync with PORTAL_MODEL_ACCESS_PATH in ./portalPaths.ts (value imports are disallowed here).
const PORTAL_MODEL_ACCESS_PATH = '/maas/model-access';

// The landing redirects ('/' and '/maas') are router redirects in ./bootstrap.tsx.
const extensions: Extension[] = [
  {
    type: 'app.route',
    flags: { required: ['observabilityDashboard'] },
    properties: {
      path: '/observe-and-monitor/dashboard/*',
      component: () => import('./observability/ObservabilityDashboard'),
    },
  } satisfies RouteExtension,

  // User dropdown (trailing = after theme toggle)
  {
    type: 'app.masthead/toolbar-item',
    properties: {
      id: 'user-dropdown',
      component: () => import('./components/UserDropdown'),
      position: 'trailing',
    },
  } satisfies MastheadToolbarItemExtension,

  // Suppress the gen-ai-studio nav section (items flattened via app.patch below)
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.navigation/section',
      targetId: 'gen-ai-studio',
    },
  } satisfies SuppressExtension,

  // Gen AI routes are not exposed by the MaaS Portal, including direct URLs.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.route',
      targetId: 'gen-ai-routes',
    },
  } satisfies SuppressExtension,

  // The portal exposes the dedicated Model access page instead of the
  // legacy MaaS governance navigation item.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'maas-governance-view',
    },
  } satisfies SuppressExtension,

  // Hide the MCP servers tab in the MaaS Portal.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'gen-ai.ai-assets/tab',
      targetId: 'mcpservers',
    },
  } satisfies SuppressExtension,

  // AI asset endpoints are not part of the MaaS Portal navigation.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'ai-assets',
    },
  } satisfies SuppressExtension,

  // Hide the Playground navigation item in the MaaS Portal.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'chat-playground',
    },
  } satisfies SuppressExtension,

  // Patch package-owned nav items: clear section (flatten) and set top-level group order
  {
    type: 'app.patch',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'ai-assets',
      patch: { section: null, group: '1_ai_assets', label: null },
    },
  } satisfies PatchExtension<NavPatch>,
  {
    type: 'app.patch',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'maas-tokens-subscriptions-view',
      patch: { section: null, group: '2_api_keys' },
    },
  } satisfies PatchExtension<NavPatch>,
  {
    type: 'app.navigation/href',
    flags: { required: ['observabilityDashboard'] },
    properties: {
      id: 'portal-observability-dashboard',
      title: 'Observability',
      href: '/observe-and-monitor/dashboard',
      path: '/observe-and-monitor/dashboard/*',
      group: '4_dashboard',
    },
  },
  {
    type: 'app.navigation/href',
    flags: { required: ['MAAS_MODEL_ACCESS_ADMIN'] },
    properties: {
      id: 'maas-model-access-portal',
      title: 'Model access',
      href: PORTAL_MODEL_ACCESS_PATH,
      path: `${PORTAL_MODEL_ACCESS_PATH}/*`,
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.patch',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'maas-governance-view',
      patch: { section: null, group: '5_maas_governance' },
    },
  } satisfies PatchExtension<NavPatch>,

  // Read-only model access viewer: the MaaS governance subscriptions table
  // (Subscription / Groups / Models, with the Groups and Models sub-tables)
  // without Status, row actions, or create/delete affordances.
  {
    type: 'app.route',
    flags: { required: ['MAAS_MODEL_ACCESS_ADMIN'] },
    properties: {
      path: `${PORTAL_MODEL_ACCESS_PATH}/view/:subscriptionName`,
      component: () => import('@odh-dashboard/maas/ModelAccessSubscriptionPage'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.route',
    flags: { required: ['MAAS_MODEL_ACCESS_ADMIN'] },
    properties: {
      path: `${PORTAL_MODEL_ACCESS_PATH}/*`,
      component: () => import('@odh-dashboard/maas/ModelAccessPage'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.route',
    properties: {
      path: '/maas/models/*',
      component: () => import('@odh-dashboard/gen-ai/MaaSModelsPageProvider'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.navigation/href',
    properties: {
      id: 'maas-models',
      title: 'Model endpoints',
      href: '/maas/models',
      path: '/maas/models/*',
      group: '1_models',
    },
  },
];

export default extensions;
