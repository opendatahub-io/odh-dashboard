import React from 'react';
import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import {
  getMcpServerAvailability,
  McpServerAvailabilityResponse,
} from '~/odh/api/mcpCatalogDeployment/service';

const useMcpServerDeployAvailable = (): { available: boolean; loaded: boolean } => {
  const callback = React.useCallback<FetchStateCallbackPromise<McpServerAvailabilityResponse>>(
    (opts: APIOptions) => getMcpServerAvailability('')(opts),
    [],
  );

  const [data, loaded, error] = useFetchState<McpServerAvailabilityResponse>(callback, {
    available: false,
  });

  return React.useMemo(
    () => ({
      available: !error && data.available,
      loaded,
    }),
    [data.available, loaded, error],
  );
};

export default useMcpServerDeployAvailable;
