import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getPipelineDefinitions } from '~/app/api/pipelines';
import type { PipelineDefinition } from '~/app/types';

/**
 * Fetches pipeline definitions from the BFF for a given namespace.
 *
 * @param namespace - The Kubernetes namespace to fetch definitions from. Returns empty when empty.
 * @returns Pipeline definitions, loading/error state, and refresh callback.
 */
export function usePipelineDefinitions(namespace: string): {
  pipelineDefinitions: PipelineDefinition[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
} {
  const [data, loaded, error, refresh] = useFetchState<PipelineDefinition[]>(
    React.useCallback<FetchStateCallbackPromise<PipelineDefinition[]>>(async () => {
      if (!namespace) {
        return [];
      }
      return getPipelineDefinitions('', namespace);
    }, [namespace]),
    [],
  );

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
