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

const extensions: Extension[] = [
  // Root redirect
  {
    type: 'app.route',
    properties: {
      path: '/',
      component: () => import('./RootRedirect'),
    },
  } satisfies RouteExtension,

  {
    type: 'app.route',
    flags: { required: ['observabilityDashboard'] },
    properties: {
      path: '/observe-and-monitor/dashboard/*',
      component: () => import('./observability/ObservabilityDashboard'),
    },
  } satisfies RouteExtension,

  // /maas redirect — overrides the package's MaaSRedirect with the
  // portal's own root redirect
  {
    type: 'app.route',
    properties: {
      path: '/maas',
      component: () => import('./RootRedirect'),
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

  // Hide the MCP servers tab in the MaaS Portal.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'gen-ai.ai-assets/tab',
      targetId: 'mcpservers',
    },
  } satisfies SuppressExtension,

  // Suppression is unconditional, so restore AAE below only when grid is disabled.
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'ai-assets',
    },
  } satisfies SuppressExtension,

  {
    type: 'app.navigation/href',
    flags: { required: ['plugin-gen-ai'], disallowed: ['grid'] },
    properties: {
      id: 'ai-assets',
      title: 'AI asset endpoints',
      href: '/gen-ai-studio/assets',
      path: '/gen-ai-studio/assets/*',
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.route',
    flags: { required: ['MAAS_MODEL_ACCESS_ADMIN'] },
    properties: {
      path: '/model-access',
      component: () => import('@odh-dashboard/maas/ModelAccessPage'),
    },
  } satisfies RouteExtension,

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
      title: 'Observability dashboard',
      href: '/observe-and-monitor/dashboard',
      path: '/observe-and-monitor/dashboard/*',
      group: '4_dashboard',
    },
  },
  {
    type: 'app.navigation/href',
    flags: { required: ['MAAS_MODEL_ACCESS_ADMIN'] },
    properties: {
      id: 'maas-model-access',
      title: 'Model Access',
      href: '/model-access',
      path: '/model-access/*',
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
  // without Status, row actions, or create/delete affordances. Available to
  // every portal user (no ADMIN_USER gate), unlike the admin-only MaaS
  // governance page above, but only in the grid portal mode.
  {
    type: 'app.route',
    flags: { required: ['grid'] },
    properties: {
      path: `${PORTAL_MODEL_ACCESS_PATH}/view/:subscriptionName`,
      component: () => import('@odh-dashboard/maas/ModelAccessSubscriptionPage'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.route',
    flags: { required: ['grid'] },
    properties: {
      path: `${PORTAL_MODEL_ACCESS_PATH}/*`,
      component: () => import('@odh-dashboard/maas/ModelAccessPage'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.route',
    flags: { required: ['grid'] },
    properties: {
      path: '/maas/models/*',
      component: () => import('@odh-dashboard/gen-ai/MaaSModelsPageProvider'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.navigation/href',
    flags: { required: ['grid'] },
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
