import React from 'react';
import { getEvaluationJobLogs, getEvaluationJobBenchmarkLogs } from '~/app/api/k8s';

type UseEvaluationJobLogsResult = {
  logs: string;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
};

export const useEvaluationJobLogs = (
  namespace: string | undefined,
  jobId: string | undefined,
  benchmarkIndex: number | undefined,
  tailLines?: number,
): UseEvaluationJobLogsResult => {
  const [logs, setLogs] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const fetchGenRef = React.useRef(0);
  const refreshControllerRef = React.useRef<AbortController>();

  const fetchLogs = React.useCallback(
    (signal?: AbortSignal) => {
      if (!namespace || !jobId) {
        setLogs('');
        setLoaded(false);
        setError(undefined);
        return;
      }

      const gen = ++fetchGenRef.current;
      setLoaded(false);
      setError(undefined);

      // eslint-disable-next-line camelcase
      const params = tailLines != null ? { tail_lines: tailLines } : undefined;
      const fetcher =
        benchmarkIndex != null
          ? getEvaluationJobBenchmarkLogs('', namespace, jobId, benchmarkIndex, params)
          : getEvaluationJobLogs('', namespace, jobId, params);

      fetcher(signal)
        .then((text) => {
          if (fetchGenRef.current !== gen) {
            return;
          }
          setLogs(text);
          setLoaded(true);
        })
        .catch((err) => {
          if (signal?.aborted) {
            return;
          }
          if (fetchGenRef.current !== gen) {
            return;
          }
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoaded(true);
        });
    },
    [namespace, jobId, benchmarkIndex, tailLines],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    fetchLogs(controller.signal);
    return () => {
      controller.abort();
      refreshControllerRef.current?.abort();
    };
  }, [fetchLogs]);

  const refresh = React.useCallback(() => {
    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    fetchLogs(controller.signal);
  }, [fetchLogs]);

  return { logs, loaded, error, refresh };
};
