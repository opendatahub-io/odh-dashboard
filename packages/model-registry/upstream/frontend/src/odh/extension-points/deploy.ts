import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
import type { ModelRegistryDeploymentListItem } from '~/odh/k8sTypes';

export type ModelRegistryDeployModalExtension = Extension<
  'model-registry.model-version/deploy-modal',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: CodeRef<
      React.ComponentType<{
        modelDeployPrefill: {
          data: ModelDeployPrefillInfo;
          loaded: boolean;
          error: Error | undefined;
        };
        onClose: () => void;
      }>
    >;
  }
>;

export const isModelRegistryDeployModalExtension =
  createExtensionGuard<ModelRegistryDeployModalExtension>(
    'model-registry.model-version/deploy-modal',
  );

export type ModelRegistryVersionDeploymentsContextExtension = Extension<
  'model-registry.model-version/deployments-context',
  {
    DeploymentsProvider: CodeRef<
      React.ComponentType<{
        children: ({
          deployments,
          loaded,
        }: {
          deployments?: ModelRegistryDeploymentListItem[];
          loaded: boolean;
        }) => React.ReactNode;
        labelSelectors?: { [key: string]: string };
        mrName?: string;
      }>
    >;
  }
>;

export const isModelRegistryVersionDeploymentsContextExtension =
  createExtensionGuard<ModelRegistryVersionDeploymentsContextExtension>(
    'model-registry.model-version/deployments-context',
  );
