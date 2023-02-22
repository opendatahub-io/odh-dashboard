import * as React from 'react';
import axios from 'axios';
import { PrometheusQueryResponse } from '~/types';

const usePrometheusQuery = (
  apiPath: string,
  query: string,
): [
  result: PrometheusQueryResponse | null,
  loaded: boolean,
  loadError: Error | undefined,
  refetch: () => void,
] => {
  const [result, setResult] = React.useState<PrometheusQueryResponse | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const fetchData = React.useCallback(() => {
    if (!query) {
      return;
    }

    axios
      .post<{ response: PrometheusQueryResponse }>(apiPath, { query })
      .then((response) => {
        setResult(response.data.response);
        setLoaded(true);
        setError(undefined);
      })
      .catch((e) => {
        setError(e);
      });
  }, [query, apiPath]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return [result, loaded, error, fetchData];
};

export default usePrometheusQuery;
