import * as React from 'react';
import axios from 'axios';
import {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResultValue,
} from '~/types';

export type ResponsePredicate<T = PrometheusQueryRangeResultValue> = (
  data: PrometheusQueryRangeResponseData,
) => T[];
const usePrometheusQueryRange = <T = PrometheusQueryRangeResultValue>(
  active: boolean,
  apiPath: string,
  queryLang: string,
  span: number,
  endInMs: number,
  step: number,
  responsePredicate?: ResponsePredicate<T>,
): [results: T[], loaded: boolean, loadError: Error | undefined, refetch: () => void] => {
  const [results, setResults] = React.useState<T[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const fetchData = React.useCallback(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    if (!active) {
      // Save us the call & data storage -- if it's not active, we don't need to fetch
      // If we are already loaded & have data, it's okay -- it can be stale data to quickly show
      // if the associated graph renders
      return;
    }
    axios
      .post<{ response: PrometheusQueryRangeResponse }>(apiPath, {
        query: `query=${queryLang}&start=${start}&end=${endInS}&step=${step}`,
      })
      .then((response) => {
        let result: T[] | PrometheusQueryRangeResultValue[];
        if (responsePredicate) {
          result = responsePredicate(response.data?.response.data);
        } else {
          result = response.data?.response.data.result?.[0]?.values || [];
        }
        setResults(result as T[]);
        setLoaded(true);
        setError(undefined);
      })
      .catch((e) => {
        setError(e);
        setLoaded(true);
      });
  }, [responsePredicate, endInMs, span, active, apiPath, queryLang, step]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return [results, loaded, error, fetchData];
};

export default usePrometheusQueryRange;
