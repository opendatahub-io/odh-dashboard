import React from 'react';
import { MlmdContext, MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import {
  GetContextByTypeAndNameRequest,
  MetadataStoreServicePromiseClient,
} from '#~/third_party/mlmd';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

export const getMlmdContext = async (
  client: MetadataStoreServicePromiseClient,
  name: string,
  type: MlmdContextTypes,
): Promise<MlmdContext | undefined> => {
  const request = new GetContextByTypeAndNameRequest();
  request.setTypeName(type);
  request.setContextName(name);
  const res = await client.getContextByTypeAndName(request);
  return res.getContext();
};

/**
 * A hook used to use the MLMD service and fetch the MLMD context
 * If being used without name/type, this hook will throw an error
 * @param name The identifier to query a specific type of MLMD context. e.g. The runID for a pipeline run
 */
export const useMlmdContext = (
  name?: string,
  type?: MlmdContextTypes,
  refreshRate?: number,
): FetchState<MlmdContext | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<MlmdContext | null>>(async () => {
    if (!type) {
      return Promise.reject(new NotReadyError('No context type'));
    }
    if (!name) {
      return Promise.reject(new NotReadyError('No context name'));
    }

    const context = await getMlmdContext(metadataStoreServiceClient, name, type);
    if (!context) {
      return Promise.reject(new Error('Cannot find specified context'));
    }
    return context;
  }, [metadataStoreServiceClient, type, name]);

  return useFetchState(call, null, {
    refreshRate,
  });
};
