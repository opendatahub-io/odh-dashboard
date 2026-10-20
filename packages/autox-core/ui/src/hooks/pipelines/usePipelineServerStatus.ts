import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useAutoXApi } from '../../context/AutoXApiContext';

const READY_CONFIRMATION_DELAY_MS = 2000;
const STATUS_POLL_INTERVAL_MS = 5000;

export const pipelineServerStatusKey = (namespace: string) =>
  ['pipelineServerStatus', namespace] as const;

export type PipelineServerStatus = {
  loaded: boolean;
  isStarting: boolean;
  error: Error | undefined;
};

/** Polls BFF-served DSPA readiness so empty-run actions stay gated while an observed server is starting. */
export const usePipelineServerStatus = (
  namespace?: string,
  enabled = true,
): PipelineServerStatus => {
  const { pipelines: pipelinesApi } = useAutoXApi();

  // Keep polling even once ready: a server restart flips Ready back to Starting,
  // and the empty-run gating must follow that transition. The BFF reads the DSPA
  // fresh (uncached) on every request, so this never reports stale readiness.
  const query = useQuery({
    queryKey: pipelineServerStatusKey(namespace ?? ''),
    enabled: Boolean(namespace) && enabled,
    queryFn: ({ signal }) => pipelinesApi.getPipelineServerStatus('', namespace ?? '', { signal }),
    refetchInterval: STATUS_POLL_INTERVAL_MS,
    retry: false,
  });

  const status = query.data;
  const readinessError = query.error ?? undefined;
  const isReady = status?.status === 'ready';
  // The query has settled once it holds either a status or an error; before that
  // the page should keep showing its loading state.
  const settled = status !== undefined || readinessError !== undefined;

  const [confirmedReadyNamespace, setConfirmedReadyNamespace] = React.useState<string>();

  React.useEffect(() => {
    setConfirmedReadyNamespace(undefined);
    if (!namespace || !settled || readinessError || !isReady) {
      return undefined;
    }

    const timeout = setTimeout(
      () => setConfirmedReadyNamespace(namespace),
      READY_CONFIRMATION_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  }, [namespace, settled, readinessError, isReady]);

  const isReadyConfirmed = isReady && confirmedReadyNamespace === namespace;
  // Only report startup after observing a DSPA. A not-found result is inconclusive
  // (the server may simply not be deployed), so let the experiments page fall back to
  // the BFF state instead of showing the blocking waiting state.
  const isStarting = !readinessError && status?.status === 'starting';

  return {
    // Give readiness a brief chance to deliver an immediate Ready -> Starting transition
    // before showing the empty state and its Create Run action.
    loaded: settled && (!isReady || isReadyConfirmed),
    isStarting,
    error: readinessError,
  };
};
