import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

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
        onSubmit: () => void;
        onClose: () => void;
      }>
    >;
  }
>;

export const isModelRegistryDeployModalExtension = (
  extension: Extension,
): extension is ModelRegistryDeployModalExtension =>
  extension.type === 'model-registry.model-version/deploy-modal';

export type ModelRegistryVersionDeploymentsContextExtension = Extension<
  'model-registry.model-version/deployments-context',
  {
    useDeploymentsContext: CodeRef<
      () => {
        deployments?: any[];
        loaded: boolean;
        errors?: Error[];
        projects?: any[];
      }
    >;
    DeploymentsProvider: CodeRef<
      React.ComponentType<{
        children: React.ReactNode;
        labelSelectors?: { [key: string]: string };
      }>
    >;
  }
>;

export const isModelRegistryVersionDeploymentsContextExtension = (
  extension: Extension,
): extension is ModelRegistryVersionDeploymentsContextExtension =>
  extension.type === 'model-registry.model-version/deployments-context';