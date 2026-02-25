import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getPipelineDefinitions } from '~/app/api/pipelines';
import type { PipelineDefinition } from '~/app/types';
import { useAutoragMockPipelines } from './useAutoragMockPipelines';

export function usePipelineDefinitions(namespace: string): {
  pipelineDefinitions: PipelineDefinition[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
} {
  const [useMock] = useAutoragMockPipelines();

  const [data, loaded, error, refresh] = useFetchState<PipelineDefinition[]>(
    React.useCallback<FetchStateCallbackPromise<PipelineDefinition[]>>(async () => {
      if (!namespace) {
        return [];
      }
      return getPipelineDefinitions(useMock, '', namespace);
    }, [namespace, useMock]),
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
    pipelineDefinitions: data,
    loaded,
    error: error ?? undefined,
    refresh: refreshWrapped,
  };
}
