import * as React from 'react';
import axios from '#~/utilities/axios';
import useFetch, { FetchStateObject, NotReadyError } from '#~/utilities/useFetch';
import { MlflowExperiment, MlflowExperimentsResponse } from '#~/concepts/mlflow/types';
import { EXPERIMENTS_ENDPOINT, FILTER_PARAM_KEY } from '#~/concepts/mlflow/const';

type UseMlflowExperimentsOptions = {
  workspace: string;
  /**
   * MLflow filter expression passed to the tracking server's SearchExperiments API.
   * Uses a SQL-like syntax. Multiple expressions can be joined with AND (no OR support).
   *
   * Supported fields:
   * - `name` (or `attributes.name`) -- string comparators: =, !=, LIKE, ILIKE
   * - `creation_time` / `last_update_time` -- numeric comparators: =, !=, >, >=, <, <=
   * - `tags.<key>` -- string comparators + IS NULL / IS NOT NULL
   *
   * @see https://mlflow.org/docs/latest/ml/search/search-experiments/
   * @example "name = 'my-experiment'"
   * @example "tags.team = 'eval-hub'"
   * @example "name LIKE '%training%' AND tags.env = 'prod'"
   * @example "tags.deprecated IS NULL"
   */
  filter?: string;
};

const buildExperimentsUrl = ({ workspace, filter }: UseMlflowExperimentsOptions): string => {
  const params = new URLSearchParams({ workspace });
  if (filter) {
    params.set(FILTER_PARAM_KEY, filter);
  }
  return `${EXPERIMENTS_ENDPOINT}?${params.toString()}`;
};

const useMlflowExperiments = ({
  workspace,
  filter,
}: UseMlflowExperimentsOptions): FetchStateObject<MlflowExperiment[]> => {
  const fetchCallback = React.useCallback(async () => {
    if (!workspace) {
      throw new NotReadyError('No workspace provided');
    }

    const response = await axios.get<MlflowExperimentsResponse>(
      buildExperimentsUrl({ workspace, filter }),
    );
    return response.data.data.experiments;
  }, [workspace, filter]);

  return useFetch(fetchCallback, [], { initialPromisePurity: true });
};

export default useMlflowExperiments;
