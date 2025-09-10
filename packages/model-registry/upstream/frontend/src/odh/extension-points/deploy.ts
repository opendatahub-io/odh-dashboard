import { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

export type ModelRegistryDeployModalExtension = Extension<
  'model-registry.model-version/deploy-modal',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: ComponentCodeRef<{
      modelDeployPrefill: {
        data: ModelDeployPrefillInfo;
        loaded: boolean;
        error: Error | undefined;
      };
      onSubmit: () => void;
      onClose: () => void;
    }>;
  }
>;

export const isModelRegistryDeployModalExtension = (
  extension: Extension,
): extension is ModelRegistryDeployModalExtension =>
  extension.type === 'model-registry.model-version/deploy-modal';

export type ModelRegistryVersionDeploymentsContextExtension = Extension<
  'model-registry.model-version/deployments-context',
  {
    DeploymentsProvider: CodeRef<
      React.ComponentType<{
        children: ({
          deployments,
          loaded,
        }: {
          deployments?: any[];
          loaded: boolean;
        }) => React.ReactNode;
        labelSelectors?: { [key: string]: string };
        mrName?: string;
      }>
    >;
  }
>;

export const isModelRegistryVersionDeploymentsContextExtension = (
  extension: Extension,
): extension is ModelRegistryVersionDeploymentsContextExtension =>
  extension.type === 'model-registry.model-version/deployments-context';