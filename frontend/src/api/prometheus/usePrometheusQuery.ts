import * as React from 'react';
import axios from 'axios';
import { PrometheusResponse } from '../../types';

const usePrometheusQuery = (
  namespace: string,
  query: string,
): [
  result: PrometheusResponse | null,
  loaded: boolean,
  loadError: Error | undefined,
  refetch: () => void,
] => {
  const [result, setResult] = React.useState<PrometheusResponse | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const fetchData = React.useCallback(() => {
    if (!namespace || !query) return;

    const path = '/api/prometheus';
    axios
      .post(path, { query, namespace })
      .then((response) => {
        setResult(response.data.response);
        setLoaded(true);
        setError(undefined);
      })
      .catch((e) => {
        setError(e);
      });
  }, [namespace, query]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return [result, loaded, error, fetchData];
};

export default usePrometheusQuery;
