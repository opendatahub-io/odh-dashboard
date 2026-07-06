import React from 'react';
import { MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import {
  MetadataStoreServicePromiseClient,
  GetContextsByTypeRequest,
  Context,
} from '#~/third_party/mlmd';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

const getMlmdContextsByType = async (
  client: MetadataStoreServicePromiseClient,
  type: MlmdContextTypes,
): Promise<Context[]> => {
  const request = new GetContextsByTypeRequest();
  request.setTypeName(type);
  const res = await client.getContextsByType(request);
  return res.getContextsList();
};

/**
 * A hook used to use the MLMD service and fetch the MLMD context by type
 * If being used without type, this hook will throw an error
 */
export const useMlmdContextsByType = (
  type?: MlmdContextTypes,
  refreshRate?: number,
): FetchState<Context[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Context[]>>(async () => {
    if (!type) {
      return Promise.reject(new NotReadyError('No context type'));
    }

    const context = await getMlmdContextsByType(metadataStoreServiceClient, type);
    return context;
  }, [metadataStoreServiceClient, type]);

  return useFetchState(call, [], {
    refreshRate,
  });
};
