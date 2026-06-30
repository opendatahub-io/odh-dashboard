import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type {
  ModelDetailsDeploymentCardExtension,
  ModelRegistryDeployModalExtension,
  ModelRegistryDetailsTabExtension,
  ModelRegistryVersionDeploymentsContextExtension,
  ModelRegistryVersionDetailsTabExtension,
  ModelRegistryTableColumnExtension,
} from '@mf/modelRegistry/extension-points';

const extensions: (
  | ModelRegistryDeployModalExtension
  | ModelRegistryVersionDetailsTabExtension
  | ModelRegistryVersionDeploymentsContextExtension
  | ModelRegistryDetailsTabExtension
  | ModelDetailsDeploymentCardExtension
  | ModelRegistryTableColumnExtension
)[] = [
  {
    type: 'model-registry.model-version/deploy-modal',
    properties: {
      useAvailablePlatformIds: () =>
        import('../modelRegistry/useAvailablePlatformIds').then((m) => m.default),
      modalComponent: () =>
        import('../modelRegistry/PreWizardDeployModal').then((m) => m.PreWizardDeployModal),
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
      component: () => import('../modelRegistry/VersionDeploymentsTab'),
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
      component: () => import('../modelRegistry/ModelWideDeploymentsTab'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'model-registry.model-details/details-card',
    properties: {
      component: () => import('../modelRegistry/ModelDetailsDeploymentCard'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'model-registry.registered-models/table-column',
    properties: {
      component: () => import('../modelRegistry/DeploymentsColumn'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
