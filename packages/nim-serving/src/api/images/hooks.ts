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
  accountLoaded?: boolean;
}): {
  data: NIMImagesData;
  loaded: boolean;
  loadError?: Error;
} => {
  const project = dependencies?.project;
  const projectName = project?.projectName;
  const nimAccount = dependencies?.nimAccount;
  const accountLoaded = dependencies?.accountLoaded ?? false;

  const fetchCallback = React.useCallback<FetchStateCallbackPromise<NIMImage[]>>(() => {
    if (!projectName) {
      return Promise.reject(new NotReadyError('No project selected'));
    }
    if (!accountLoaded) {
      return Promise.reject(new NotReadyError('NIM account not loaded'));
    }
    if (!nimAccount) {
      return Promise.resolve([]);
    }
    return fetchNIMImages(nimAccount);
  }, [projectName, nimAccount, accountLoaded]);

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
