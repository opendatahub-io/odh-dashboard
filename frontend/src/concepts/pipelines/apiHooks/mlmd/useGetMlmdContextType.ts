import React from 'react';
import { MlmdContextType, MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { GetContextTypeRequest } from '#~/third_party/mlmd';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

export const useGetMlmdContextType = (
  type?: MlmdContextTypes,
): FetchState<MlmdContextType | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<MlmdContextType | null>>(async () => {
    if (!type) {
      return Promise.reject(new NotReadyError('No context type'));
    }

    const request = new GetContextTypeRequest();
    request.setTypeName(type);
    const res = await metadataStoreServiceClient.getContextType(request);
    const contextType = res.getContextType() || null;
    return contextType;
  }, [metadataStoreServiceClient, type]);

  return useFetchState(call, null);
};
