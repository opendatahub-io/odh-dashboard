import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { NavExtension, RouteExtension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: (NavExtension | RouteExtension)[] = [
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      id: 'eval-hub',
      title: 'Evaluations (Federated Mode)',
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
];

export default extensions;
