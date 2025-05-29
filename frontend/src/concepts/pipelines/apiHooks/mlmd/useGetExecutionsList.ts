import React from 'react';
import { useMlmdListContext, usePipelinesAPI } from '#~/concepts/pipelines/context';
import { Execution, GetExecutionsRequest } from '#~/third_party/mlmd';
import { ListOperationOptions } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_pb';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

export interface ExecutionsListResponse {
  executions: Execution[];
  nextPageToken: string;
}

export const useGetExecutionsList = (): FetchState<ExecutionsListResponse | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();
  const { pageToken, maxResultSize, filterQuery } = useMlmdListContext();

  const call = React.useCallback<FetchStateCallbackPromise<ExecutionsListResponse>>(async () => {
    const request = new GetExecutionsRequest();
    const listOperationOptions = new ListOperationOptions();
    listOperationOptions.setOrderByField(
      new ListOperationOptions.OrderByField().setField(ListOperationOptions.OrderByField.Field.ID),
    );

    if (filterQuery) {
      listOperationOptions.setFilterQuery(filterQuery);
    }
    if (pageToken) {
      listOperationOptions.setNextPageToken(pageToken);
    }

    listOperationOptions.setMaxResultSize(maxResultSize);
    request.setOptions(listOperationOptions);

    const response = await metadataStoreServiceClient.getExecutions(request);
    const nextPageToken = response.getNextPageToken();
    listOperationOptions.setNextPageToken(nextPageToken);

    return { executions: response.getExecutionsList(), nextPageToken };
  }, [filterQuery, maxResultSize, metadataStoreServiceClient, pageToken]);

  return useFetchState(call, null);
};
