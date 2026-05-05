import { FetchState } from 'mod-arch-core';
import { McpToolList } from '~/app/mcpServerCatalogTypes';
export declare const useMcpServerToolList: (serverId: string) => FetchState<McpToolList>;
