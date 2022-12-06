import * as React from 'react';
import axios from 'axios';
import { PrometheusQueryRangeResponse, PrometheusQueryRangeResultValue } from '../../types';

const usePrometheusQueryRange = (
  apiPath: string,
  queryLang: string,
  span: number,
  endInMs: number,
  step: number,
): [
  results: PrometheusQueryRangeResultValue[],
  loaded: boolean,
  loadError: Error | undefined,
  refetch: () => void,
] => {
  const [results, setResults] = React.useState<PrometheusQueryRangeResultValue[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const fetchData = React.useCallback(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    axios
      .post<{ response: PrometheusQueryRangeResponse }>(apiPath, {
        query: `${queryLang}&start=${start}&end=${endInS}&step=${step}`,
      })
      .then((response) => {
        const result = response.data?.response.data.result?.[0]?.values || [];
        setResults(result);
        setLoaded(true);
        setError(undefined);
      })
      .catch((e) => {
        setError(e);
        setLoaded(true);
      });
  }, [queryLang, apiPath, span, endInMs, step]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return [results, loaded, error, fetchData];
};

export default usePrometheusQueryRange;
