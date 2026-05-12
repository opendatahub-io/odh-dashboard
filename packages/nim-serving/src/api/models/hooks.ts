import React from 'react';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/internal/utilities/useFetch';
import type { NIMModelInfo } from './types';
import { fetchNIMModelNames } from './utils';

export type NIMImagesData = {
  modelInfos: NIMModelInfo[];
  projectName?: string;
};

export const useNIMImages = (dependencies?: {
  project?: { projectName?: string };
}): {
  data: NIMImagesData;
  loaded: boolean;
  loadError?: Error;
} => {
  const project = dependencies?.project;
  const projectName = project?.projectName;

  const fetchCallback = React.useCallback<FetchStateCallbackPromise<NIMModelInfo[]>>(() => {
    if (!projectName) {
      return Promise.reject(new NotReadyError('No project selected'));
    }
    return fetchNIMModelNames(projectName);
  }, [projectName]);

  const { data: modelInfos, loaded, error: loadError } = useFetch(fetchCallback, []);

  return React.useMemo(
    () => ({
      data: { modelInfos, projectName },
      loaded,
      loadError,
    }),
    [modelInfos, projectName, loaded, loadError],
  );
};
