import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getPipelineRuns } from '~/app/api/pipelines';
import type { PipelineDefinition, PipelineRun } from '~/app/types';
import { useAutoragMockPipelines } from './useAutoragMockPipelines';

export function usePipelineRuns(
  namespace: string,
  pipelineDefinitions: PipelineDefinition[],
): {
  runs: PipelineRun[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
} {
  const [useMock] = useAutoragMockPipelines();
  const pipelineIds = React.useMemo(
    () => pipelineDefinitions.map((p) => p.id),
    [pipelineDefinitions],
  );

  const [data, loaded, error, refresh] = useFetchState<PipelineRun[]>(
    React.useCallback<FetchStateCallbackPromise<PipelineRun[]>>(
      async () => {
        if (!namespace || pipelineIds.length === 0) {
          return [];
        }
        return getPipelineRuns(useMock, '', namespace, pipelineIds);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- pipelineIds from useMemo, stable when pipelineDefinitions unchanged
      [namespace, pipelineIds.join(','), useMock],
    ),
    [],
  );

  // Re-fetch when useMock changes (e.g. via window.setAutoragMockPipelines)
  const useMockRef = React.useRef(useMock);
  React.useEffect(() => {
    if (useMockRef.current !== useMock) {
      useMockRef.current = useMock;
      void refresh();
    }
  }, [useMock, refresh]);

  const refreshWrapped = React.useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    runs: data,
    loaded,
    error: error ?? undefined,
    refresh: refreshWrapped,
  };
}
