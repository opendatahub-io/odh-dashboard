import React from 'react';
import {
  useFetchState,
  useQueryParamNamespaces,
  APIOptions,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-core';
import { getMcpServerConverter } from '~/odh/api/mcpCatalogDeployment/service';
import { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';

const useMcpServerConverter = (
  serverId: string,
): [data: MCPServerCR | null, loaded: boolean, error: Error | undefined] => {
  // The model registries namespace is required by the BFF for catalog API calls
  const queryParams = useQueryParamNamespaces();

  const callback = React.useCallback<FetchStateCallbackPromise<MCPServerCR>>(
    (opts: APIOptions) => {
      if (!serverId) {
        return Promise.reject(new NotReadyError('No server id'));
      }
      return getMcpServerConverter('', queryParams)(opts, serverId);
    },
    [serverId, queryParams],
  );

  const [data, loaded, error] = useFetchState<MCPServerCR | null>(callback, null, {
    initialPromisePurity: true,
  });

  return [data, loaded, error];
};

export default useMcpServerConverter;
