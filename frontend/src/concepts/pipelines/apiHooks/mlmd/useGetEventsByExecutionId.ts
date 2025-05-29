import React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { GetEventsByExecutionIDsRequest, Event } from '#~/third_party/mlmd';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

export const useGetEventsByExecutionId = (executionId?: number): FetchState<Event[] | null> => {
  const ids = React.useMemo(() => (executionId !== undefined ? [executionId] : []), [executionId]);
  return useGetEventsByExecutionIds(ids);
};

export const useGetEventsByExecutionIds = (executionIds: number[]): FetchState<Event[] | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Event[] | null>>(async () => {
    const request = new GetEventsByExecutionIDsRequest();

    request.setExecutionIdsList(executionIds);

    const response = await metadataStoreServiceClient.getEventsByExecutionIDs(request);

    return response.getEventsList();
  }, [executionIds, metadataStoreServiceClient]);

  return useFetchState(call, null);
};
