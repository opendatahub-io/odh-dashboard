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
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      id: 'security-insights',
      title: 'Safety and security insights',
      group: 'model-catalog.details',
      component: () => import('../app/pages/modelCatalog/SecurityInsightsTab'),
    },
  },
];

export default extensions;
