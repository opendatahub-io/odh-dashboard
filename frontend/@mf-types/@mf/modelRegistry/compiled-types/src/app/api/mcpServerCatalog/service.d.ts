import { APIOptions } from 'mod-arch-core';
import { McpServer, McpServerList, McpServerListParams, McpToolList } from '~/app/mcpServerCatalogTypes';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';
export declare const getMcpServerList: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, listParams?: McpServerListParams) => Promise<McpServerList>;
export declare const getMcpServerFilterOptionList: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<CatalogFilterOptionsList>;
export declare const getMcpServer: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, serverId: string) => Promise<McpServer>;
export declare const getMcpServerToolList: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, serverId: string) => Promise<McpToolList>;
