import React from 'react';
import { useQueryParamNamespaces, APIOptions, FetchState } from 'mod-arch-core';
import { getMcpServerDeployReadiness } from '~/odh/api/mcpCatalogDeployment/service';
import usePolledMcpDeployReadiness from '~/odh/hooks/usePolledMcpDeployReadiness';
import { McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

/**
 * Fetches the deploy prerequisites for a catalog MCP server, re-checking while it is not
 * deployable. Servers that don't require a gateway are never polled.
 *
 * @deprecated RHOAI 3.6 stopgap: the BFF hardcodes which server needs an MCP gateway.
 * Replace with catalog metadata that declares deploy prerequisites; do not reuse for other
 * servers.
 */
const useMcpServerDeployReadiness = (
  serverId: string,
): FetchState<McpServerDeployReadiness | null> => {
  // The model registries namespace is required by the BFF for catalog API calls
  const queryParams = useQueryParamNamespaces();

  const fetchReadiness = React.useMemo(
    () =>
      serverId
        ? (opts: APIOptions) => getMcpServerDeployReadiness('', queryParams)(opts, serverId)
        : undefined,
    [serverId, queryParams],
  );

  return usePolledMcpDeployReadiness(fetchReadiness);
};

export default useMcpServerDeployReadiness;
