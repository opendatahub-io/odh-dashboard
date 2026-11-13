import * as React from 'react';
import { APIOptions, FetchState, useFetchState } from 'mod-arch-core';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { runGatewayLayerUsability } from '~/odh/api/gatewayLayerService';
import { GatewayLayerUsability } from '~/odh/types/gatewayLayerTypes';

const useGatewayLayerUsability = (
  namespace: string | undefined,
  enabled: boolean,
): FetchState<GatewayLayerUsability | null> => {
  const queryParams = React.useMemo(() => ({ namespace: namespace ?? '' }), [namespace]);
  const callback = React.useMemo(
    () =>
      namespace && enabled
        ? (opts: APIOptions) => runGatewayLayerUsability(BFF_HOST_PATH, queryParams)(opts)
        : () => Promise.resolve(null),
    [enabled, namespace, queryParams],
  );

  return useFetchState<GatewayLayerUsability | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: 0,
  });
};

export default useGatewayLayerUsability;
