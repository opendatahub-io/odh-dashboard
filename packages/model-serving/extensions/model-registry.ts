import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  ModelRegistryDeployModalExtension,
  ModelRegistryVersionDeploymentsContextExtension,
} from '@mf/modelRegistry/extension-points';

const extensions: (
  | ModelRegistryDeployModalExtension
  | ModelRegistryVersionDeploymentsContextExtension
  | Extension
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
    type: 'core.detail/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      group: 'model-registry.version-details',
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
    type: 'core.detail/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      group: 'model-registry.details',
      component: () => import('../modelRegistry/ModelWideDeploymentsTab'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'core.detail-card',
    properties: {
      group: 'model-registry.model-details',
      component: () => import('../modelRegistry/ModelDetailsDeploymentCard'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'core.table-column',
    properties: {
      group: 'model-registry.registered-models',
      component: () => import('../modelRegistry/DeploymentsColumn'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
