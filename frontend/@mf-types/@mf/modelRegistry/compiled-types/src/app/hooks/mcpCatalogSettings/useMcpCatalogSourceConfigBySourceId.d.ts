import { FetchState } from 'mod-arch-core';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
type State = McpCatalogSourceConfig | null;
export declare const useMcpCatalogSourceConfigBySourceId: (sourceId: string) => FetchState<State>;
export {};
