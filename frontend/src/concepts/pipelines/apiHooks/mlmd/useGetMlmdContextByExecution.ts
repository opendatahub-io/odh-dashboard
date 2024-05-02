import React from 'react';
import { MlmdContext, MlmdContextTypes } from '~/concepts/pipelines/apiHooks/mlmd/types';
import { useGetMlmdContextType } from '~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextType';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { Execution } from '~/third_party/mlmd';
import { GetContextsByExecutionRequest } from '~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

const useGetMlmdContextByExecution = (
  execution: Execution,
  type?: MlmdContextTypes,
): FetchState<MlmdContext | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();
  const executionId = execution.getId();
  const [contextType] = useGetMlmdContextType(type);

  const contextTypeId = contextType?.getId();

  const call = React.useCallback<FetchStateCallbackPromise<MlmdContext | null>>(async () => {
    const request = new GetContextsByExecutionRequest();

    request.setExecutionId(executionId);

    const response = await metadataStoreServiceClient.getContextsByExecution(request);

    const result = response.getContextsList().filter((c) => c.getTypeId() === contextTypeId);

    return result.length === 1 ? result[0] : null;
  }, [executionId, metadataStoreServiceClient, contextTypeId]);

  return useFetchState(call, null);
};

export const useGetPipelineRunContextByExecution = (
  execution: Execution,
): FetchState<MlmdContext | null> => useGetMlmdContextByExecution(execution, MlmdContextTypes.RUN);
