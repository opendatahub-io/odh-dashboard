import type { ModelRegistryDeployModalExtension } from '@mf/modelRegistry/extension-points';

const extensions: ModelRegistryDeployModalExtension[] = [
  {
    type: 'model-registry.model-version/deploy-modal',
    properties: {
      useDeployButtonState: () =>
        import('../modelRegistry/useDeployButtonState').then((m) => m.default),
      modalComponent: () =>
        import('../modelRegistry/DeployRegisteredVersionModal').then(
          (m) => m.DeployRegisteredVersionModal,
        ),
    },
  },
];

export default extensions;
