import React from 'react';
import {
  useFetchState,
  NotReadyError,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { fetchVolume } from '~/app/api/dataRegistry';
import { VolumeInfo } from '~/app/types';

export const useVolume = (
  project?: string,
  collection?: string,
  name?: string,
): FetchState<VolumeInfo | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<VolumeInfo | null>>(
    (opts: APIOptions) => {
      if (!project || !collection || !name) {
        return Promise.reject(new NotReadyError('Missing project, collection, or volume name'));
      }
      return fetchVolume(project, collection, name, opts);
    },
    [project, collection, name],
  );

  return useFetchState<VolumeInfo | null>(callback, null);
};
