import type { RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow these imports as they consist of enums and constants only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
// eslint-disable-next-line no-restricted-syntax
import { globMlflowAll } from '@odh-dashboard/internal/routes/pipelines/mlflow';

/**
 * MLflow host-side extensions.
 *
 * Only the route is declared here (needs host internals for page chrome).
 * Area and nav extensions are declared in the remote's extensions.ts so
 * they only appear when the MLflow remote loads successfully.
 */
const extensions: RouteExtension[] = [
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.DS_PIPELINES, SupportedArea.MLFLOW],
    },
    properties: {
      path: globMlflowAll,
      component: () => import('./GlobalMLflowExperimentsRoutes'),
    },
  },
];

export default extensions;
