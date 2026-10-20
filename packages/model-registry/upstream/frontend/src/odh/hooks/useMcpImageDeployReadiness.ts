import React from 'react';
import { APIOptions, FetchState } from 'mod-arch-core';
import { getMcpDeployReadiness } from '~/odh/api/mcpCatalogDeployment/service';
import usePolledMcpDeployReadiness from '~/odh/hooks/usePolledMcpDeployReadiness';
import { McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

/**
 * Fetches the deploy prerequisites for deploying an image to a namespace, for deploy entry
 * points without a catalog server ID (the MCP registry). Only the image decides, because
 * registry names are user-editable. Re-checks while not deployable.
 *
 * @deprecated RHOAI 3.6 stopgap: the BFF hardcodes which server needs an MCP gateway.
 * Replace with catalog metadata that declares deploy prerequisites.
 */
const useMcpImageDeployReadiness = (
  namespace: string | undefined,
  image: string | undefined,
): FetchState<McpServerDeployReadiness | null> => {
  const fetchReadiness = React.useMemo(
    () =>
      namespace && image
        ? (opts: APIOptions) => getMcpDeployReadiness('', { namespace })(opts, image)
        : undefined,
    [namespace, image],
  );

  return usePolledMcpDeployReadiness(fetchReadiness);
};

export default useMcpImageDeployReadiness;
