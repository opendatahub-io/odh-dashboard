import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';

export type McpServerDeployModalExtension = Extension<
  'mcp-catalog.mcp-server/deploy-modal',
  {
    useIsDeployAvailable: CodeRef<() => { available: boolean; loaded: boolean }>;
  }
>;

export const isMcpServerDeployModalExtension = createExtensionGuard<McpServerDeployModalExtension>(
  'mcp-catalog.mcp-server/deploy-modal',
);
