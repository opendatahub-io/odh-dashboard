import React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { Execution, GetExecutionsByIDRequest } from '#~/third_party/mlmd';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

export const useGetExecutionById = (executionId?: string): FetchState<Execution | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Execution | null>>(async () => {
    const numberId = Number(executionId);
    const request = new GetExecutionsByIDRequest();

    if (!executionId || Number.isNaN(numberId)) {
      return null;
    }

    request.setExecutionIdsList([numberId]);

    const response = await metadataStoreServiceClient.getExecutionsByID(request);

    return response.getExecutionsList().length !== 0 ? response.getExecutionsList()[0] : null;
  }, [executionId, metadataStoreServiceClient]);

  return useFetchState(call, null);
};
