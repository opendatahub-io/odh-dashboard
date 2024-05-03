import React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  GetEventsByExecutionIDsRequest,
  GetEventsByExecutionIDsResponse,
} from '~/third_party/mlmd';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

export const useGetEventsByExecutionId = (
  executionId?: string,
): FetchState<GetEventsByExecutionIDsResponse | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<
    FetchStateCallbackPromise<GetEventsByExecutionIDsResponse | null>
  >(async () => {
    const numberId = Number(executionId);
    const request = new GetEventsByExecutionIDsRequest();

    if (!executionId || Number.isNaN(numberId)) {
      return null;
    }

    request.setExecutionIdsList([numberId]);

    const response = await metadataStoreServiceClient.getEventsByExecutionIDs(request);

    return response;
  }, [executionId, metadataStoreServiceClient]);

  return useFetchState(call, null);
};
