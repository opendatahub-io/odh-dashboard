import * as React from 'react';
import { FetchState, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import { McpServer } from '~/app/mcpServerCatalogTypes';
import { getMcpServerList } from '~/app/api/mcpServerCatalog/service';
import { BFF_HOST_PATH } from '~/app/utilities/const';

const MCP_CATALOG_HOST_PATH = `${BFF_HOST_PATH}/mcp_catalog`;

// The catalog's `name` filter matches substrings, not exact names, so we page
// through results (bounded) until we find the exact match.
const CATALOG_LOOKUP_PAGE_SIZE = 20;
const CATALOG_LOOKUP_MAX_PAGES = 10;

/** Resolves the catalog display name for a catalog-sourced deployment by searching
 * the catalog for an exact name match. Returns `null` while loading or unresolved. */
const useMcpDeploymentCatalogServer = (
  serverName: string | undefined,
  namespace: string | undefined,
): FetchState<McpServer | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<McpServer | null>>(
    async (opts) => {
      if (!serverName || !namespace) {
        throw new NotReadyError('No catalog server name or namespace');
      }
      const listMcpServers = getMcpServerList(MCP_CATALOG_HOST_PATH, { namespace });

      let nextPageToken: string | undefined;
      for (let page = 0; page < CATALOG_LOOKUP_MAX_PAGES; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const list = await listMcpServers(opts, {
          name: serverName,
          pageSize: CATALOG_LOOKUP_PAGE_SIZE,
          nextPageToken,
        });
        const match = list.items?.find((item) => item.name === serverName);
        if (match) {
          return match;
        }
        if (!list.nextPageToken) {
          break;
        }
        nextPageToken = list.nextPageToken;
      }
      return null;
    },
    [serverName, namespace],
  );

  return useFetchState(callback, null, { initialPromisePurity: true });
};

export default useMcpDeploymentCatalogServer;
