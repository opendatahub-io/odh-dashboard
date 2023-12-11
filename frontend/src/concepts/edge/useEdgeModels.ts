import React from 'react';
import { listK8sPipelineRunsByLabel } from '~/api';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { EdgeModel } from './types';
import { organizePipelineRuns } from './utils';
import { EDGE_UNIQUE_LABEL } from './const';

export const useEdgeModels = (namespace: string) => {
  const callback = React.useCallback<FetchStateCallbackPromise<EdgeModel[]>>(async () => {
    const runs = await listK8sPipelineRunsByLabel(namespace, EDGE_UNIQUE_LABEL);
    return Object.values(organizePipelineRuns(runs));
  }, [namespace]);

  return useFetchState(callback, []);
};
