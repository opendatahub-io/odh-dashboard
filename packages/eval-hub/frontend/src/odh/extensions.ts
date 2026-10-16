import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type {
  DetailTabExtension,
  NavExtension,
  RouteExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const VISIBILITY_REQUEST_TIMEOUT_MS = 10_000;
const MODEL_CATALOG_API_PATH = '/model-registry/api/v1/model_catalog/sources';
const EVAL_HUB_CATALOG_API_PATH = '/eval-hub/api/v1/catalog/sources';

type CatalogArtifactVisibilityOptions = {
  apiPath?: string;
};

const hasCatalogArtifacts = async (
  props: Record<string, unknown>,
  path: string,
  additionalParams: Record<string, string> = {},
  { apiPath = MODEL_CATALOG_API_PATH }: CatalogArtifactVisibilityOptions = {},
): Promise<boolean> => {
  const { sourceId, modelName, namespace } = props;
  if (typeof sourceId !== 'string' || typeof modelName !== 'string') {
    return false;
  }

  if (typeof namespace !== 'string') {
    // The namespace (AI Hub instances namespace) is not resolved yet — hide the tab for now.
    // The predicate re-runs when the namespace prop changes and resolves.
    return false;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), VISIBILITY_REQUEST_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({ pageSize: '1', ...additionalParams });
    params.set('namespace', namespace);
    const url = `${apiPath}/${encodeURIComponent(sourceId)}/${path}/${encodeURIComponent(
      modelName,
    )}?${params.toString()}`;
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

const extensions: (NavExtension | RouteExtension | TaskItemExtension | DetailTabExtension)[] = [
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      id: 'eval-hub',
      title: 'Evaluations',
      href: '/evaluation',
      section: 'develop-and-train',
      path: '/evaluation/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      path: '/evaluation/*',
      component: () => import('./EvalHubWrapper'),
    },
  },
  {
    type: 'app.task/item',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      id: 'develop-evaluate',
      group: 'develop-and-train',
      title: 'Evaluate models',
      destination: { href: '/evaluation' },
      order: '2_evaluate',
    },
  },
  {
    type: 'core.detail/tab',
    properties: {
      id: 'security-insights',
      title: 'Safety and security insights',
      group: 'model-catalog.details',
      component: () => import('../app/pages/modelCatalog/SecurityInsightsTab'),
      visibilityErrorMessage:
        'An error occurred while trying to determine if security metrics exist',
      shouldShow: (props) =>
        hasCatalogArtifacts(
          props,
          'security_artifacts',
          {},
          {
            apiPath: EVAL_HUB_CATALOG_API_PATH,
          },
        ),
    },
  } satisfies DetailTabExtension,
  {
    type: 'core.detail/tab',
    properties: {
      id: 'quality-insights',
      title: 'Quality insights',
      group: 'model-catalog.details',
      component: () => import('../app/pages/modelCatalog/QualityInsightsTab'),
      visibilityErrorMessage:
        'An error occurred while trying to determine if quality metrics exist',
      shouldShow: (props) =>
        hasCatalogArtifacts(
          props,
          'quality_artifacts',
          {},
          {
            apiPath: EVAL_HUB_CATALOG_API_PATH,
          },
        ),
    },
  } satisfies DetailTabExtension,
];

export default extensions;
