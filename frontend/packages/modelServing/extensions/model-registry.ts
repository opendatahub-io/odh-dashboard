// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { ModelRegistryDeployModalExtension } from '@mf/modelRegistry/extension-points';

const extensions: ModelRegistryDeployModalExtension[] = [
  {
    type: 'model-registry.model-version/deploy-modal',
    properties: {
      useAvailablePlatformIds: () =>
        import('../modelRegistry/useAvailablePlatformIds').then((m) => m.default),
      modalComponent: () =>
        import('../modelRegistry/DeployRegisteredVersionModal').then(
          (m) => m.DeployRegisteredVersionModal,
        ),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
