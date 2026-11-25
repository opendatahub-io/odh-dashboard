import React from 'react';
import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ListArtifactsResponseKF } from '#~/concepts/pipelines/kfTypes';

export const useGetArtifactsList = (
  pageToken?: string,
  pageSize = 10,
  filter?: string,
): FetchState<ListArtifactsResponseKF | undefined> => {
  const { api, namespace } = usePipelinesAPI();

  const fetchArtifactsList = React.useCallback(
    (opts: Parameters<typeof api.listArtifactResources>[0]) =>
      api.listArtifactResources(opts, {
        namespace,
        pageSize,
        pageToken,
        sortBy: 'created_at desc',
        filter,
      }),
    [api, namespace, pageSize, pageToken, filter],
  );

  return useFetchState(fetchArtifactsList, undefined, { initialPromisePurity: true });
};
