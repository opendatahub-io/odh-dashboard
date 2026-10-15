import { FetchState } from 'mod-arch-core';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
export declare const useMcpCatalogSourceConfigBySourceId: (sourceId: string) => FetchState<McpCatalogSourceConfig | null>;
