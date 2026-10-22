import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { DetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import type {
  AutofillConnectionButtonExtension,
  CatalogSettingsUrlExtension,
  McpCatalogCardLabelExtension,
  McpCatalogSettingsUrlExtension,
  ModelCatalogBannerExtension,
  NamespaceSelectorExtension,
  ProjectsBridgeProviderExtension,
  RegistrySettingsUrlExtension,
  UserInteractionProviderExtension,
} from '@mf/modelRegistry/extension-points';
// Value imports are not allowed in extensions.ts (only dynamic imports for code refs), so the
// tab visibility predicates live here. The constants mirror `src/modelCatalog/api.ts`; the
// extensions spec asserts the exact probe URLs against the api.ts exports, guarding drift.
const MODEL_CATALOG_API_PATH = '/model-registry/api/v1/model_catalog/sources';
const QUALITY_ARTIFACT_TYPE = 'metrics-artifact';
const QUALITY_FILTER_QUERY = 'metricsType.string_value="evaluation-metrics"';

const VISIBILITY_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Probes the model-registry BFF for catalog artifacts to decide whether an
 * insights tab should be shown. Returns false on 403/404 (no artifacts the user
 * can see). While the namespace is unresolved the predicate stays pending —
 * ExtensibleDetailTabs keeps non-active tabs hidden and retains the active
 * (deep-linked) tab while a predicate is pending, so an unresolved namespace
 * cannot redirect a deep link away before the predicate re-runs once the
 * namespace prop resolves.
 */
const hasCatalogArtifacts = async (
  props: Record<string, unknown>,
  path: string,
  additionalParams: Record<string, string> = {},
): Promise<boolean> => {
  const { sourceId, modelName, namespace } = props;
  if (typeof sourceId !== 'string' || typeof modelName !== 'string') {
    return false;
  }

  if (typeof namespace !== 'string') {
    // The namespace (AI Hub instances namespace) is not resolved yet — stay pending
    // instead of resolving false so an active deep-linked tab is not redirected to
    // another tab before the namespace resolves and the predicate re-runs.
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- an executor that never settles keeps the predicate pending
    return new Promise<boolean>(() => {});
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), VISIBILITY_REQUEST_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({ pageSize: '1', ...additionalParams });
    params.set('namespace', namespace);
    const url = `${MODEL_CATALOG_API_PATH}/${encodeURIComponent(
      sourceId,
    )}/${path}/${encodeURIComponent(modelName)}?${params.toString()}`;
    const resp = await fetch(url, { signal: controller.signal });
    if (resp.status === 403 || resp.status === 404) {
      return false;
    }
    if (!resp.ok) {
      throw new Error(`Catalog artifact visibility request failed with status ${resp.status}.`);
    }
    const json: { data?: { items?: unknown[] } } = await resp.json();
    return Array.isArray(json.data?.items) && json.data.items.length > 0;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const hasSecurityArtifacts = (props: Record<string, unknown>): Promise<boolean> =>
  hasCatalogArtifacts(props, 'security_artifacts');

const hasQualityArtifacts = (props: Record<string, unknown>): Promise<boolean> =>
  hasCatalogArtifacts(props, 'artifacts', {
    artifactType: QUALITY_ARTIFACT_TYPE,
    filterQuery: QUALITY_FILTER_QUERY,
  });
const CATALOG_SETTINGS_PAGE_TITLE = 'Model catalog settings';
const CATALOG_SETTINGS_URL = '/settings/model-resources-operations/model-catalog';

const REGISTRY_SETTINGS_PAGE_TITLE = 'Model registry settings';
const REGISTRY_SETTINGS_URL = '/settings/model-resources-operations/model-registry';

const MCP_CATALOG_SETTINGS_NAV_TITLE = 'MCP catalog sources';
const MCP_CATALOG_SETTINGS_URL = '/settings/mcp-resources/mcp-catalog';

const extensions: (
  | AutofillConnectionButtonExtension
  | McpCatalogCardLabelExtension
  | NamespaceSelectorExtension
  | ProjectsBridgeProviderExtension
  | UserInteractionProviderExtension
  | ModelCatalogBannerExtension
  | CatalogSettingsUrlExtension
  | McpCatalogSettingsUrlExtension
  | RegistrySettingsUrlExtension
  | DetailTabExtension
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
    type: 'core.detail/tab',
    properties: {
      id: 'security-insights',
      title: 'Safety and security insights',
      group: 'model-catalog.details',
      component: () => import('./src/modelCatalog/SecurityInsightsTab'),
      visibilityErrorMessage:
        'An error occurred while trying to determine if security metrics exist',
      shouldShow: hasSecurityArtifacts,
    },
  } satisfies DetailTabExtension,
  {
    type: 'core.detail/tab',
    properties: {
      id: 'quality-insights',
      title: 'Quality insights',
      group: 'model-catalog.details',
      component: () => import('./src/modelCatalog/QualityInsightsTab'),
      visibilityErrorMessage:
        'An error occurred while trying to determine if quality metrics exist',
      shouldShow: hasQualityArtifacts,
    },
  } satisfies DetailTabExtension,
  {
    type: 'mcp-catalog.card/label',
    properties: {
      id: 'mcp-support-tier-label',
      component: () => import('./src/mcpCatalog/McpSupportTierLabel').then((m) => m.default),
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
    type: 'model-registry.settings/url',
    properties: {
      url: REGISTRY_SETTINGS_URL,
      title: REGISTRY_SETTINGS_PAGE_TITLE,
    },
  },
  {
    type: 'mcp-catalog.settings/url',
    properties: {
      url: MCP_CATALOG_SETTINGS_URL,
      title: MCP_CATALOG_SETTINGS_NAV_TITLE,
    },
  },
  {
    type: 'model-registry.namespace/selector',
    properties: {
      component: () => import('./src/projectSelector/ProjectSelectorField'),
    },
  },
  {
    type: 'model-registry.projects/bridge-provider',
    properties: {
      component: () => import('./src/projectSelector/ProjectsBridgeProvider'),
    },
  },
  {
    type: 'model-registry.tracking/provider',
    properties: {
      component: () => import('./src/tracking/SegmentUserInteractionProvider'),
    },
  },
];

export default extensions;
