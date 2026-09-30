import React from 'react';
import {
  useFetchState,
  NotReadyError,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { fetchGenericTable } from '~/app/api/dataRegistry';
import { AssetResponse } from '~/app/types';

export const useGenericTable = (
  project?: string,
  collection?: string,
  name?: string,
): FetchState<AssetResponse | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<AssetResponse | null>>(
    (opts: APIOptions) => {
      if (!project || !collection || !name) {
        return Promise.reject(new NotReadyError('Missing project, collection, or asset name'));
      }
      return fetchGenericTable(project, collection, name, opts);
    },
    [project, collection, name],
  );

  return useFetchState<AssetResponse | null>(callback, null);
};
