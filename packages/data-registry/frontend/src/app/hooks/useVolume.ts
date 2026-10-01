import React from 'react';
import {
  useFetchState,
  NotReadyError,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { fetchVolume } from '~/app/api/dataRegistry';
import { AssetResponse } from '~/app/types';

export const useVolume = (
  project?: string,
  collection?: string,
  name?: string,
): FetchState<AssetResponse | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<AssetResponse | null>>(
    (opts: APIOptions) => {
      if (!project || !collection || !name) {
        return Promise.reject(new NotReadyError('Missing project, collection, or volume name'));
      }
      return fetchVolume(project, collection, name, opts);
    },
    [project, collection, name],
  );

  return useFetchState<AssetResponse | null>(callback, null);
};
