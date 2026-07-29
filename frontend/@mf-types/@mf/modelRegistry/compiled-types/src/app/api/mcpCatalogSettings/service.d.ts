import { APIOptions } from 'mod-arch-core';
import { PreviewCatalogSourceQueryParams } from '~/app/modelCatalogTypes';
import { McpCatalogSourceConfig, McpCatalogSourceConfigList, McpCatalogSourceConfigPayload, McpCatalogSourcePreviewRequest, McpCatalogSourcePreviewResult } from '~/app/mcpServerCatalogTypes';
export declare const getMcpCatalogSourceConfigs: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<McpCatalogSourceConfigList>;
export declare const createMcpCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: McpCatalogSourceConfigPayload) => Promise<McpCatalogSourceConfig>;
export declare const getMcpCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string) => Promise<McpCatalogSourceConfig>;
export declare const updateMcpCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string, data: Partial<McpCatalogSourceConfigPayload>) => Promise<McpCatalogSourceConfig>;
export declare const deleteMcpCatalogSourceConfig: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, sourceId: string) => Promise<void>;
export declare const previewMcpCatalogSource: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: McpCatalogSourcePreviewRequest, additionalQueryParams?: PreviewCatalogSourceQueryParams) => Promise<McpCatalogSourcePreviewResult>;
