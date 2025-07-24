import type { ModelRegistryDeploymentsTabExtension } from '@mf/modelRegistry/extension-points';

const extensions: ModelRegistryDeploymentsTabExtension[] = [
  {
    type: 'model-registry.version-details/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      component: () =>
        import('../src/components/deployments/ModelVersionRegisteredDeploymentsViewWrapper'),
    },
  },
];

export default extensions;
