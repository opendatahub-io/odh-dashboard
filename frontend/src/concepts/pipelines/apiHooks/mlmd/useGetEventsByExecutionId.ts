import React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  GetEventsByExecutionIDsRequest,
  GetEventsByExecutionIDsResponse,
} from '~/third_party/mlmd';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

export const useGetEventsByExecutionId = (
  executionId?: string,
): FetchState<GetEventsByExecutionIDsResponse | null> =>
  useGetEventsByExecutionIds([Number(executionId)]);

export const useGetEventsByExecutionIds = (
  executionIds: number[],
): FetchState<GetEventsByExecutionIDsResponse | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<
    FetchStateCallbackPromise<GetEventsByExecutionIDsResponse | null>
  >(async () => {
    const request = new GetEventsByExecutionIDsRequest();

    request.setExecutionIdsList(executionIds);

    const response = await metadataStoreServiceClient.getEventsByExecutionIDs(request);

    return response;
  }, [executionIds, metadataStoreServiceClient]);

  return useFetchState(call, null);
};
