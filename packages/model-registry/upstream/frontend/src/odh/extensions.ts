import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import {
  CATALOG_SETTINGS_PAGE_TITLE,
  catalogSettingsUrl,
} from '~/app/routes/modelCatalogSettings/modelCatalogSettings';
import { mcpCatalogUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import { McpServerDeployModalExtension } from './extension-points';

const reliantAreas = ['model-registry'];
const PLUGIN_MODEL_REGISTRY = 'model-registry-plugin';
const ADMIN_USER = 'ADMIN_USER';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/internal/utilities/v2Redirect').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const extensions: (NavExtension | RouteExtension | AreaExtension | TabRouteTabExtension | McpServerDeployModalExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_REGISTRY,
      reliantAreas,
      devFlags: [
        'Model Registry Plugin (unreleased pages)',
        'KF MR Upstream: Catalog HuggingFace API Key',
      ],
    },
  },
  // Tab extensions for the Models tabbed page
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      pageId: 'models-tab-page',
      id: 'catalog',
      title: 'Catalog',
      component: () => import('./ModelCatalogWrapper'),
      group: '1_catalog',
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY],
    },
    properties: {
      pageId: 'models-tab-page',
      id: 'registry',
      title: 'Registry',
      component: () => import('./ModelRegistryWrapper'),
      group: '2_registry',
    },
  },
  // Tab extension for MCP servers tabbed page
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      pageId: 'mcp-servers-tab-page',
      id: 'catalog',
      title: 'Catalog',
      component: () => import('./McpCatalogWrapper'),
      group: '1_catalog',
    },
  },
  // KF plugin nav items (kept as-is, these are dev-flag-gated)
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      id: 'modelRegistry-kf',
      title: 'Model registry (KF)',
      href: '/ai-hub/models/registry',
      section: 'ai-hub',
      path: '/ai-hub/models/registry/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      id: 'settings-model-registry',
      title: 'Model registry settings (KF)',
      // TODO: Change to /settings/model-resources-operations/model-registry once made default
      href: '/model-registry-settings',
      section: 'settings-model-resources-and-operations',
      // TODO: Change to /settings/model-resources-operations/model-registry once made default
      path: '/model-registry-settings/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      path: '/model-registry-settings/*',
      component: () => import('./ModelRegistrySettingsRoutesWrapper'),
    },
  },
  // Redirects from old URLs
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      path: '/ai-hub/catalog/*',
      component: createRedirectComponent({
        from: '/ai-hub/catalog/*',
        to: '/ai-hub/models/catalog/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY],
    },
    properties: {
      path: '/ai-hub/registry/*',
      component: createRedirectComponent({
        from: '/ai-hub/registry/*',
        to: '/ai-hub/models/registry/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      path: '/ai-hub/mcp-catalog/*',
      component: createRedirectComponent({
        from: '/ai-hub/mcp-catalog/*',
        to: `${mcpCatalogUrl()}/*`,
      }),
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      pageId: 'mcp-servers-tab-page',
      id: 'deployments',
      title: 'Deployments',
      component: () => import('./McpDeploymentsWrapper'),
      group: '2_deployments',
    },
  },
  // Redirect from old MCP deployments URL
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      path: '/ai-hub/mcp-deployments/*',
      component: createRedirectComponent({
        from: '/ai-hub/mcp-deployments/*',
        to: '/ai-hub/mcp-servers/deployments/*',
      }),
    },
  },
  // Settings (unchanged)
  {
    type: 'app.navigation/href',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      id: 'settings-model-catalog',
      title: CATALOG_SETTINGS_PAGE_TITLE,
      href: catalogSettingsUrl(),
      section: 'settings-model-resources-and-operations',
      path: `${catalogSettingsUrl()}/*`,
      group: '2_model-resources',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: `${catalogSettingsUrl()}/*`,
      component: () => import('./ModelCatalogSettingsRoutesWrapper'),
    },
  },
  {
    type: 'mcp-catalog.mcp-server/deploy-modal',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      useIsDeployAvailable: () =>
        import('../app/hooks/mcpCatalogDeployment/useMcpServerDeployAvailable').then((m) => m.default),
    },
  },
];

export default extensions;
