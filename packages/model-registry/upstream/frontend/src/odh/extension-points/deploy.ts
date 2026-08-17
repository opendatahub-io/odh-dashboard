import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type { ModelDeployPrefillInfo } from '@odh-dashboard/model-registry/shared';
import type { ModelRegistryDeploymentListItem } from '~/odh/k8sTypes';
import type { McpDeployment, McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';

/** Slot for `McpDeployModal`, lets other packages reuse it without a static import across the Module Federation boundary. */
export type McpCatalogDeployModalExtension = Extension<
  'mcp-catalog.server/deploy-modal',
  {
    modalComponent: CodeRef<
      React.ComponentType<{
        data?: McpDeployModalData;
        isLoading?: boolean;
        loadError?: Error;
        onClose: (saved?: boolean) => void;
        /** Called after the CR is created, before `onClose`. Must not throw — implementations should catch and report their own errors. */
        onDeployed?: (deployment: McpDeployment) => void | Promise<void>;
      }>
    >;
  }
>;

export const isMcpCatalogDeployModalExtension =
  createExtensionGuard<McpCatalogDeployModalExtension>('mcp-catalog.server/deploy-modal');

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
