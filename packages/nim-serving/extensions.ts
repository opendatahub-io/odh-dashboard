import type {
  AreaExtension,
  ProjectDetailsSettingsCardExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  DeployedModelServingDetails,
  ModelServingPlatformWatchDeploymentsExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { NIMDeployment } from './src/api/deployments/useWatchDeployments';

export const NIM_ID = 'nvidia-nim';

const extensions: (
  | AreaExtension
  | ProjectDetailsSettingsCardExtension
  | ModelServingPlatformWatchDeploymentsExtension<NIMDeployment>
  | DeployedModelServingDetails<NIMDeployment>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.NIM_WIZARD,
      featureFlags: ['nimWizard'],
      reliantAreas: [SupportedArea.NIM_MODEL],
    },
  },
  {
    type: 'app.project-details/settings-card',
    properties: {
      id: 'nim-settings',
      title: 'NVIDIA NIM',
      component: () => import('./src/pages/projectSettings/NIMSettingsCard'),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: NIM_ID,
      watch: () =>
        import('./src/api/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: NIM_ID,
      ServingDetailsComponent: () => import('./src/pages/deployments/NIMServingDetails'),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
];

export default extensions;
