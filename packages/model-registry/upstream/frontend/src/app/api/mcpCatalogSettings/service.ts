import {
  APIOptions,
  assembleModArchBody,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
  restPATCH,
} from 'mod-arch-core';
import { PreviewCatalogSourceQueryParams } from '~/app/modelCatalogTypes';
import {
  McpCatalogSourceConfig,
  McpCatalogSourceConfigList,
  McpCatalogSourceConfigPayload,
  McpCatalogSourcePreviewRequest,
  McpCatalogSourcePreviewResult,
} from '~/app/mcpServerCatalogTypes';

export const getMcpCatalogSourceConfigs =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<McpCatalogSourceConfigList> =>
    handleRestFailures(restGET(hostPath, '/source_configs', queryParams, opts)).then((response) => {
      if (isModArchResponse<McpCatalogSourceConfigList>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const createMcpCatalogSourceConfig =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, data: McpCatalogSourceConfigPayload): Promise<McpCatalogSourceConfig> =>
    handleRestFailures(
      restCREATE(hostPath, '/source_configs', assembleModArchBody(data), queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<McpCatalogSourceConfig>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getMcpCatalogSourceConfig =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, sourceId: string): Promise<McpCatalogSourceConfig> =>
    handleRestFailures(restGET(hostPath, `/source_configs/${sourceId}`, queryParams, opts)).then(
      (response) => {
        if (isModArchResponse<McpCatalogSourceConfig>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      },
    );

export const updateMcpCatalogSourceConfig =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (
    opts: APIOptions,
    sourceId: string,
    data: Partial<McpCatalogSourceConfigPayload>,
  ): Promise<McpCatalogSourceConfig> =>
    handleRestFailures(
      restPATCH(
        hostPath,
        `/source_configs/${sourceId}`,
        assembleModArchBody(data),
        queryParams,
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<McpCatalogSourceConfig>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const deleteMcpCatalogSourceConfig =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, sourceId: string): Promise<void> =>
    handleRestFailures(restDELETE(hostPath, `/source_configs/${sourceId}`, {}, queryParams, opts));

export const previewMcpCatalogSource =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (
    opts: APIOptions,
    data: McpCatalogSourcePreviewRequest,
    additionalQueryParams?: PreviewCatalogSourceQueryParams,
  ): Promise<McpCatalogSourcePreviewResult> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        '/source_preview',
        assembleModArchBody(data),
        { ...queryParams, ...additionalQueryParams, assetType: 'mcp_servers' },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<McpCatalogSourcePreviewResult>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
