import React from 'react';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { listK8sPipelinesByLabel } from '~/api';
import { PipelineKind } from '~/k8sTypes';
import { EDGE_UNIQUE_LABEL } from '~/concepts/edge/const';

export const useEdgePipelines = (namespace: string) => {
  const callback = React.useCallback<FetchStateCallbackPromise<PipelineKind[]>>(
    async () => await listK8sPipelinesByLabel(namespace, EDGE_UNIQUE_LABEL),
    [namespace],
  );

  return useFetchState(callback, []);
};
