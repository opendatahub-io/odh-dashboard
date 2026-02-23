import * as React from 'react';
import { APIOptions, FetchState, NotReadyError, useFetchState } from 'mod-arch-core';
import { MLflowPromptsResponse } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

type UseFetchMLflowPromptsOptions = {
  maxResults?: number;
  filterName?: string;
};

const useFetchMLflowPrompts = (
  options: UseFetchMLflowPromptsOptions = {},
): FetchState<MLflowPromptsResponse> => {
  const { api, apiAvailable } = useGenAiAPI();
  const { maxResults, filterName } = options;

  const fetchData = React.useCallback(
    (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      const queryParams: Record<string, unknown> = {};
      if (maxResults !== undefined) {
        // eslint-disable-next-line camelcase -- MLflow API uses snake_case
        queryParams.max_results = maxResults;
      }
      if (filterName !== undefined) {
        // eslint-disable-next-line camelcase -- MLflow API uses snake_case
        queryParams.filter_name = filterName;
      }
      return api.listMLflowPrompts(queryParams, opts);
    },
    [api, apiAvailable, maxResults, filterName],
  );

  return useFetchState<MLflowPromptsResponse>(fetchData, { prompts: [] });
};

export default useFetchMLflowPrompts;
