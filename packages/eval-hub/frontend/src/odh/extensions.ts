import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type {
  DetailTabExtension,
  NavExtension,
  RouteExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

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
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      id: 'security-insights',
      title: 'Safety and security insights',
      group: 'model-catalog.details',
      component: () => import('../app/pages/modelCatalog/SecurityInsightsTab'),
      shouldShow: async (props: Record<string, unknown>): Promise<boolean> => {
        const { sourceId, modelName, namespace } = props;
        if (typeof sourceId !== 'string' || typeof modelName !== 'string') {
          return false;
        }
        try {
          const params = new URLSearchParams({ pageSize: '1' });
          if (typeof namespace === 'string') {
            params.set('namespace', namespace);
          }
          const url = `/model-registry/api/v1/model_catalog/sources/${encodeURIComponent(sourceId)}/security_artifacts/${encodeURIComponent(modelName)}?${params.toString()}`;
          const resp = await fetch(url);
          if (!resp.ok) {
            return false;
          }
          const json: { data?: { items?: unknown[] } } = await resp.json();
          return Array.isArray(json.data?.items) && json.data.items.length > 0;
        } catch {
          return false;
        }
      },
    },
  } satisfies DetailTabExtension,
];

export default extensions;
