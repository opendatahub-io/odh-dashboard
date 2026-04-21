import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type McpServerDeployModalExtension = Extension<
  'mcp-catalog.mcp-server/deploy-modal',
  {
    useIsDeployAvailable: CodeRef<() => { available: boolean; loaded: boolean }>;
  }
>;

export const isMcpServerDeployModalExtension = (
  extension: Extension,
): extension is McpServerDeployModalExtension =>
  extension.type === 'mcp-catalog.mcp-server/deploy-modal';
