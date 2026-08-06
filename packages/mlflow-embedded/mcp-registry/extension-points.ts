import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type {
  McpDeployModalData,
  McpDeployment,
} from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';

// Local mirror of model-registry's mcp-catalog.server/deploy-modal.
// Can't import across Module Federation boundary, so keep type string in sync.
export type McpCatalogDeployModalExtension = Extension<
  'mcp-catalog.server/deploy-modal',
  {
    modalComponent: CodeRef<
      React.ComponentType<{
        data?: McpDeployModalData;
        isLoading?: boolean;
        loadError?: Error;
        onClose: (saved?: boolean) => void;
        onDeployed?: (deployment: McpDeployment) => void | Promise<void>;
      }>
    >;
  }
>;

export const isMcpCatalogDeployModalExtension =
  createExtensionGuard<McpCatalogDeployModalExtension>('mcp-catalog.server/deploy-modal');
