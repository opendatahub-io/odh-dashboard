import { APIState } from 'mod-arch-core';
import { McpCatalogSettingsAPIs } from '~/app/mcpServerCatalogTypes';
export type McpCatalogSettingsAPIState = APIState<McpCatalogSettingsAPIs>;
declare const useMcpCatalogSettingsAPIState: (hostPath: string | null, queryParameters?: Record<string, unknown>, previewHostPath?: string | null) => [apiState: McpCatalogSettingsAPIState, refreshAPIState: () => void];
export default useMcpCatalogSettingsAPIState;
