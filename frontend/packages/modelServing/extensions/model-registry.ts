// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  ModelRegistryDeployModalExtension,
  ModelRegistryVersionDeploymentsContextExtension,
  ModelRegistryVersionDetailsTabExtension,
} from '@mf/modelRegistry/extension-points';

const extensions: (
  | ModelRegistryDeployModalExtension
  | ModelRegistryVersionDetailsTabExtension
  | ModelRegistryVersionDeploymentsContextExtension
)[] = [
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
  {
    type: 'model-registry.version-details/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      component: () => import('../modelRegistry/DeploymentsTab').then((m) => m.default),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'model-registry.model-version/deployments-context',
    properties: {
      DeploymentsProvider: () =>
        import('../modelRegistry/DeploymentsContextProvider').then((m) => m.default),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
