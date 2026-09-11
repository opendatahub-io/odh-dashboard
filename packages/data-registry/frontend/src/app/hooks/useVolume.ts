import React from 'react';
import { useFetchState, NotReadyError, type FetchState } from 'mod-arch-core';
import { fetchVolume } from '~/app/api/dataRegistry';
import { VolumeInfo } from '~/app/types';

export const useVolume = (
  project?: string,
  collection?: string,
  name?: string,
): FetchState<VolumeInfo | null> => {
  const callback = React.useCallback(() => {
    if (!project || !collection || !name) {
      return Promise.reject(new NotReadyError('Missing project, collection, or volume name'));
    }
    return fetchVolume(project, collection, name);
  }, [project, collection, name]);

  return useFetchState<VolumeInfo | null>(callback, null);
};
