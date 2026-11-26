import React from 'react';
import {
  useFetchState,
  NotReadyError,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { fetchGenericTable } from '~/app/api/dataRegistry';
import { StructuredAssetResponse } from '~/app/types';

export const useGenericTable = (
  project?: string,
  collection?: string,
  name?: string,
): FetchState<StructuredAssetResponse | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<StructuredAssetResponse | null>>(
    (opts: APIOptions) => {
      if (!project || !collection || !name) {
        return Promise.reject(new NotReadyError('Missing project, collection, or asset name'));
      }
      return fetchGenericTable(project, collection, name, opts);
    },
    [project, collection, name],
  );

  return useFetchState<StructuredAssetResponse | null>(callback, null);
};
