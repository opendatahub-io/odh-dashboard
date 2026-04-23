import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  NavExtension,
  RouteExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const extensions: (NavExtension | RouteExtension | TaskItemExtension)[] = [
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
];

export default extensions;
