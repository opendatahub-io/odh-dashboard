import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getPipelineRuns } from '~/app/api/pipelines';
import type { PipelineDefinition, PipelineRun } from '~/app/types';

export function usePipelineRuns(
  namespace: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API compatibility with callers
  pipelineDefinitions: PipelineDefinition[],
): {
  runs: PipelineRun[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
} {
  const [data, loaded, error, refresh] = useFetchState<PipelineRun[]>(
    React.useCallback<FetchStateCallbackPromise<PipelineRun[]>>(async () => {
      if (!namespace) {
        return [];
      }
      return getPipelineRuns('', namespace);
    }, [namespace]),
    [],
  );

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
