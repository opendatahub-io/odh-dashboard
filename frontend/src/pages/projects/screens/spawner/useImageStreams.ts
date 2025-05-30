import * as React from 'react';
import { ImageStreamKind } from '#~/k8sTypes';
import { getNotebookImageStreams } from '#~/api';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';

const useImageStreams = (
  namespace: string,
  includeDisabled?: boolean,
): FetchState<ImageStreamKind[]> => {
  const getImages = React.useCallback(
    () => getNotebookImageStreams(namespace, includeDisabled),
    [namespace, includeDisabled],
  );

  return useFetchState<ImageStreamKind[]>(getImages, []);
};

export default useImageStreams;
