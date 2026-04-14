import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  AutofillConnectionButtonExtension,
  NamespaceSelectorExtension,
} from '@mf/modelRegistry/extension-points';
import type { McpServerDeployModalExtension } from './src/odh/extension-points/mcp-deploy';

const CATALOG_SETTINGS_PAGE_TITLE = 'Model catalog settings';
const CATALOG_SETTINGS_URL = '/settings/model-resources-operations/model-catalog';

type ModelCatalogBannerExtension = Extension<
  'model-catalog.page/banner',
  {
    id: string;
    component: CodeRef<React.ComponentType>;
  }
>;

type CatalogSettingsUrlExtension = Extension<
  'model-catalog.settings/url',
  {
    url: string;
    title: string;
  }
>;

const extensions: (
  | AutofillConnectionButtonExtension
  | NamespaceSelectorExtension
  | ModelCatalogBannerExtension
  | CatalogSettingsUrlExtension
  | McpServerDeployModalExtension
  | Extension
)[] = [
  {
    type: 'model-registry.register/autofill-connection',
    properties: {
      component: () => import('./src/connection/AutofillConnectionButton'),
    },
  },
  {
    type: 'model-catalog.page/banner',
    properties: {
      id: 'validated-models-banner',
      component: () => import('./src/modelCatalog/ValidatedModelsBanner').then((m) => m.default),
    },
  },
  {
    type: 'model-registry.admin/check',
    properties: {
      component: () => import('./upstream/frontend/src/odh/components/AdminCheck'),
    },
  },
  {
    type: 'model-catalog.settings/url',
    properties: {
      url: CATALOG_SETTINGS_URL,
      title: CATALOG_SETTINGS_PAGE_TITLE,
    },
  },
  {
    type: 'model-registry.namespace/selector',
    properties: {
      component: () => import('./src/projectSelector/ProjectSelectorField'),
    },
  },
  // MCP deployments tab
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      pageId: 'mcp-servers-tab-page',
      id: 'deployments',
      title: 'Deployments',
      component: () => import('./src/odh/McpDeploymentsWrapper'),
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
      component: () =>
        import('@odh-dashboard/internal/utilities/v2Redirect').then((module) => ({
          default: () =>
            module.buildV2RedirectElement({
              from: '/ai-hub/mcp-deployments/*',
              to: '/ai-hub/mcp-servers/deployments/*',
            }),
        })),
    },
  },
  // MCP deploy button (used on upstream MCP server details page)
  {
    type: 'mcp-catalog.mcp-server/deploy-button',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      component: () => import('./src/odh/components/McpDeployButton'),
    },
  },
  // MCP deploy modal hook
  {
    type: 'mcp-catalog.mcp-server/deploy-modal',
    flags: {
      required: [SupportedArea.MCP_CATALOG],
    },
    properties: {
      useIsDeployAvailable: () =>
        import('./src/hooks/useMcpServerDeployAvailable').then((m) => m.default),
    },
  },
];

export default extensions;
