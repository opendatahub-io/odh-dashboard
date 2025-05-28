import * as React from 'react';
import { ImageStreamKind } from '~/k8sTypes';
import { listImageStreams } from '~/api';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

export const useImageStreams = (
  namespace: string,
  includeDisabled?: boolean,
): FetchState<ImageStreamKind[]> => {
  const type = includeDisabled === false ? 'other' : undefined;
  const getImages = React.useCallback(() => listImageStreams(namespace, type), [namespace, type]);

  return useFetchState<ImageStreamKind[]>(getImages, []);
};
