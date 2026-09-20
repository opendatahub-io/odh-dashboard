import { FetchState, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getMcpServerConverter, getMcpServerToolsList } from '~/app/api/mcpServerCatalog';
import type { McpServerCRData, McpToolList, McpToolWithServer } from '~/app/types/mcpCatalogTypes';

/** Catalog default is 10; request larger pages and walk tokens until complete. */
const TOOLS_PAGE_SIZE = 100;
const MAX_TOOL_PAGES = 50;
const emptyToolList: McpToolList = { items: [], size: 0, pageSize: 0, nextPageToken: '' };

const fetchAllMcpServerTools = async (
  fetchPage: (nextPageToken?: string) => Promise<McpToolList>,
): Promise<McpToolList> => {
  const items: McpToolWithServer[] = [];
  let nextPageToken = '';

  for (let page = 0; page < MAX_TOOL_PAGES; page += 1) {
    const result = await fetchPage(nextPageToken || undefined);
    items.push(...(result.items ?? []));
    const token = result.nextPageToken.trim();
    if (!token) {
      return {
        items,
        size: items.length,
        pageSize: items.length,
        nextPageToken: '',
      };
    }
    nextPageToken = token;
  }

  throw new Error('Catalog tools list is too large to load completely.');
};

/**
 * Fetch MCP catalog tools via the mlflow inter-BFF proxy to model-registry BFF
 * GET /api/v1/mcp-catalog/servers/{id}/tools
 * Walk pagination to get a full tools list.
 */
export const useMcpServerToolList = (
  serverId: string,
  catalogNamespace: string,
): FetchState<McpToolList> => {
  const call = React.useCallback<FetchStateCallbackPromise<McpToolList>>(
    (opts) => {
      if (!serverId) {
        return Promise.reject(new NotReadyError('No server id'));
      }
      if (!catalogNamespace) {
        return Promise.reject(new NotReadyError('No MCP catalog namespace'));
      }
      return fetchAllMcpServerTools((nextPageToken) =>
        getMcpServerToolsList({
          namespace: catalogNamespace,
          pageSize: TOOLS_PAGE_SIZE,
          ...(nextPageToken ? { nextPageToken } : {}),
        })(opts, serverId),
      );
    },
    [serverId, catalogNamespace],
  );
  return useFetchState(call, emptyToolList, { initialPromisePurity: true });
};

/**
 * Fetch the converted MCPServer CR via mlflow inter-BFF proxy to model-registry catalog converter
 * GET /api/v1/mcp-catalog/servers/:id/mcpserver
 * Used to embed deploy-spec in registered server.json `_meta`.
 */
export const useMcpServerConverter = (
  serverId: string,
  registriesNamespace: string,
): FetchState<McpServerCRData | null> => {
  const call = React.useCallback<FetchStateCallbackPromise<McpServerCRData | null>>(
    (opts) => {
      if (!serverId) {
        return Promise.reject(new NotReadyError('No server id'));
      }
      if (!registriesNamespace) {
        return Promise.reject(new NotReadyError('No MCP catalog namespace'));
      }
      return getMcpServerConverter({ namespace: registriesNamespace })(opts, serverId);
    },
    [serverId, registriesNamespace],
  );
  return useFetchState(call, null, { initialPromisePurity: true });
};
