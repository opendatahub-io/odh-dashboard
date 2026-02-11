import type { RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

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
      path: '/develop-train/experiments-mlflow/*',
      component: () => import('./GlobalMLflowExperimentsRoutes'),
    },
  },
];

export default extensions;
