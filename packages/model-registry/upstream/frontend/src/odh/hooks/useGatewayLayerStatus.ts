import * as React from 'react';
import { FetchState, POLL_INTERVAL, useFetchState } from 'mod-arch-core';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { getGatewayLayerStatus } from '~/odh/api/gatewayLayerService';
import { GatewayLayerStatus } from '~/odh/types/gatewayLayerTypes';

const useGatewayLayerStatus = (namespace: string | undefined): FetchState<GatewayLayerStatus | null> => {
  const hasNamespace = !!namespace;
  const queryParams = React.useMemo(() => ({ namespace: namespace ?? '' }), [namespace]);
  const callback = React.useMemo(
    () =>
      hasNamespace
        ? getGatewayLayerStatus(BFF_HOST_PATH, queryParams)
        : () => Promise.resolve(null),
    [hasNamespace, queryParams],
  );

  return useFetchState<GatewayLayerStatus | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: hasNamespace ? POLL_INTERVAL : 0,
  });
};

export default useGatewayLayerStatus;
