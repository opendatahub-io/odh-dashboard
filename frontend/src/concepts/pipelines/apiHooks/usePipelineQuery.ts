import * as React from 'react';
import { PipelineCoreResourceKF, PipelineKFCallCommon } from '#~/concepts/pipelines/kfTypes';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { PipelineListPaged, PipelineOptions, PipelineParams } from '#~/concepts/pipelines/types';
import { POLL_INTERVAL } from '#~/utilities/const';
import { K8sAPIOptions } from '#~/k8sTypes';

const usePipelineQuery = <T extends PipelineCoreResourceKF>(
  apiFetch: (
    opts: K8sAPIOptions,
    params?: PipelineParams,
  ) => PipelineKFCallCommon<unknown> & { items?: T[] },
  options?: PipelineOptions,
  refreshRate = POLL_INTERVAL,
): FetchState<PipelineListPaged<T>> => {
  const [totalSize, setTotalSize] = React.useState(0);
  const { sortField, sortDirection, page = 1, pageSize, filter } = options ?? {};
  const pageTokensRef = React.useRef<(string | undefined)[]>([]);

  React.useEffect(() => {
    setTotalSize(0);
    // Reset total size when the filter changes
  }, [filter]);

  const call = React.useCallback<FetchStateCallbackPromise<PipelineListPaged<T>>>(
    async (opts) => {
      if (page > 1 && !pageTokensRef.current[page - 1]) {
        throw new Error(`No token available for page ${page}.`);
      }
      const result = await apiFetch(opts, {
        pageSize,
        pageToken: pageTokensRef.current[page - 1],
        sortField,
        sortDirection,
        filter,
      });

      return {
        items: result.items || [],
        totalSize: result.total_size || result.items?.length || 0,
        nextPageToken: result.next_page_token,
      };
    },
    [page, apiFetch, pageSize, sortField, sortDirection, filter],
  );

  const [result, loaded, error, refresh] = useFetchState<PipelineListPaged<T>>(
    call,
    { totalSize: 0, items: [] },
    {
      initialPromisePurity: true,
      refreshRate,
    },
  );

  React.useEffect(() => {
    if (loaded) {
      // Update only when loaded turns to true or when we have a new totalSize
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTotalSize(result.totalSize);
    }
  }, [loaded, result.totalSize]);

  React.useEffect(() => {
    if (loaded && pageTokensRef.current[page] !== result.nextPageToken) {
      const newTokens = pageTokensRef.current.slice(0, page);
      newTokens[page] = result.nextPageToken;
      pageTokensRef.current = newTokens;
    }
    // Update only when loaded turns to true or when we have a new nextPageToken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, result.nextPageToken]);

  return [
    // return the cached total size when not loaded
    { ...result, totalSize: loaded ? result.totalSize : totalSize },
    loaded,
    error,
    refresh,
  ];
};

export default usePipelineQuery;
