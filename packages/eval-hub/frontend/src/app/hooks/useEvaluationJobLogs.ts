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

  const fetchLogs = React.useCallback(() => {
    if (!namespace || !jobId) {
      setLogs('');
      setLoaded(false);
      setError(undefined);
      return;
    }

    setLoaded(false);
    setError(undefined);

    // eslint-disable-next-line camelcase
    const params = tailLines != null ? { tail_lines: tailLines } : undefined;
    const fetcher =
      benchmarkIndex != null
        ? getEvaluationJobBenchmarkLogs('', namespace, jobId, benchmarkIndex, params)
        : getEvaluationJobLogs('', namespace, jobId, params);

    fetcher()
      .then((text) => {
        setLogs(text);
        setLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoaded(true);
      });
  }, [namespace, jobId, benchmarkIndex, tailLines]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loaded, error, refresh: fetchLogs };
};
