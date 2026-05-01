import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { ModelServingPlatformWatchDeploymentsExtension } from '@odh-dashboard/model-serving/extension-points';
import type { NIMDeployment } from './src/deployments';

export const NIM_ID = 'nvidia-nim';

const extensions: (AreaExtension | ModelServingPlatformWatchDeploymentsExtension<NIMDeployment>)[] =
  [
    {
      type: 'app.area',
      properties: {
        id: 'nim-wizard',
        featureFlags: ['nimWizard'],
        reliantAreas: [SupportedArea.NIM_MODEL],
      },
    },
    {
      type: 'model-serving.platform/watch-deployments',
      properties: {
        platform: NIM_ID,
        watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
      },
      flags: {
        required: [SupportedArea.NIM_MODEL],
      },
    },
  ];

export default extensions;
