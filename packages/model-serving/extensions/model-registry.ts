// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type {
  ModelDetailsDeploymentCardExtension,
  ModelRegistryDeployModalExtension,
  ModelRegistryVersionDeploymentsContextExtension,
  ModelRegistryVersionDetailsTabExtension,
} from '@mf/modelRegistry/extension-points';

type ModelRegistryDetailsTabExtension = Extension<
  'model-registry.details/tab',
  {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<{ rmId?: string; mrName?: string }>>;
  }
>;

const extensions: (
  | ModelRegistryDeployModalExtension
  | ModelRegistryVersionDetailsTabExtension
  | ModelRegistryVersionDeploymentsContextExtension
  | ModelRegistryDetailsTabExtension
  | ModelDetailsDeploymentCardExtension
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
      component: () => import('../modelRegistry/VersionDeploymentsTab').then((m) => m.default),
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
  {
    type: 'model-registry.details/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      component: () => import('../modelRegistry/ModelWideDeploymentsTab').then((m) => m.default),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'model-registry.details/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      component: () => import('../modelRegistry/ModelWideDeploymentsTab').then((m) => m.default),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'model-registry.model-details/details-card',
    properties: {
      component: () => import('../modelRegistry/ModelDetailsDeploymentCard').then((m) => m.default),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
