import React from 'react';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/internal/utilities/useFetch';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
import type { NIMImage } from './types';
import { fetchNIMImages } from './api';

export type NIMImagesData = {
  images: NIMImage[];
  projectName?: string;
};

export const useNIMImages = (dependencies?: {
  project?: { projectName?: string };
  nimAccount?: NIMAccountKind | null;
}): {
  data: NIMImagesData;
  loaded: boolean;
  loadError?: Error;
} => {
  const project = dependencies?.project;
  const projectName = project?.projectName;
  const nimAccount = dependencies?.nimAccount;

  const fetchCallback = React.useCallback<FetchStateCallbackPromise<NIMImage[]>>(() => {
    if (!projectName) {
      return Promise.reject(new NotReadyError('No project selected'));
    }
    if (!nimAccount) {
      return Promise.reject(new NotReadyError('NIM account not loaded'));
    }
    return fetchNIMImages(nimAccount);
  }, [projectName, nimAccount]);

  const { data: images, loaded, error: loadError } = useFetch(fetchCallback, []);

  return React.useMemo(
    () => ({
      data: { images, projectName },
      loaded,
      loadError,
    }),
    [images, projectName, loaded, loadError],
  );
};
