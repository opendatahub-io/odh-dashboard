import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import type { McpServerCRData, McpToolList } from '~/app/types/mcpCatalogTypes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

const mcpServerCatalogProxyPath = (serverId: string): string =>
  `${URL_PREFIX}/api/${BFF_API_VERSION}/mcp-catalog/servers/${encodeURIComponent(serverId)}`;

export type GetMcpServerToolsListQueryParams = {
  namespace: string;
  filterQuery?: string;
  pageSize?: number;
  orderBy?: string;
  sortOrder?: string;
  nextPageToken?: string;
};

export const getMcpServerToolsList =
  (queryParams: GetMcpServerToolsListQueryParams, hostPath = '') =>
  (opts: APIOptions, serverId: string): Promise<McpToolList> =>
    handleRestFailures(
      restGET(hostPath, `${mcpServerCatalogProxyPath(serverId)}/tools`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<McpToolList>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getMcpServerConverter =
  (
    queryParams: {
      namespace: string;
    },
    hostPath = '',
  ) =>
  (opts: APIOptions, serverId: string): Promise<McpServerCRData> =>
    handleRestFailures(
      restGET(hostPath, `${mcpServerCatalogProxyPath(serverId)}/mcpserver`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<McpServerCRData>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
