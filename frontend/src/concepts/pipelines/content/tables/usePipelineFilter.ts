/* eslint-disable camelcase */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExperimentKF,
  PipelinesFilterOp,
  PipelinesFilterPredicate,
} from '#~/concepts/pipelines/kfTypes';

import { PipelinesFilter } from '#~/concepts/pipelines/types';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import FilterToolbar from '#~/components/FilterToolbar';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

export enum FilterOptions {
  NAME = 'name',
  CREATED_AT = 'create_at',
  STATUS = 'status',
  RUN_GROUP = 'run_group',
  PIPELINE_VERSION = 'pipeline_version',
  MLFLOW_EXPERIMENT = 'mlflow_experiment',
}

export const LEGACY_EXPERIMENT_FILTER_PARAM = 'experiment';

export const getDataValue = (data: string | { value: string } | undefined): string | undefined => {
  if (typeof data === 'string' || typeof data === 'undefined') {
    return data;
  }
  return data.value;
};

export type FilterProps = Pick<
  React.ComponentProps<typeof FilterToolbar>,
  'filterData' | 'onFilterUpdate'
> & { onClearFilters: () => void };

const defaultFilterData: FilterProps['filterData'] = {
  [FilterOptions.NAME]: '',
  [FilterOptions.CREATED_AT]: '',
  [FilterOptions.STATUS]: '',
  [FilterOptions.RUN_GROUP]: '',
  [FilterOptions.PIPELINE_VERSION]: undefined,
  [FilterOptions.MLFLOW_EXPERIMENT]: '',
};

const resolveExperimentPredicate = (
  runGroupName: string | undefined,
  experiments: ExperimentKF[],
  legacyExperimentRawId?: string,
  legacyExperimentId?: string,
): PipelinesFilterPredicate | undefined => {
  if (legacyExperimentRawId) {
    return {
      key: 'experiment_id',
      operation: PipelinesFilterOp.EQUALS,
      string_value: legacyExperimentRawId,
    };
  }
  if (legacyExperimentId) {
    return {
      key: 'experiment_id',
      operation: PipelinesFilterOp.EQUALS,
      string_value: legacyExperimentId,
    };
  }
  if (!runGroupName) {
    return undefined;
  }
  const match = experiments.find((e) => e.display_name === runGroupName);
  if (!match) {
    return undefined;
  }
  return {
    key: 'experiment_id',
    operation: PipelinesFilterOp.EQUALS,
    string_value: match.experiment_id,
  };
};

const EMPTY_EXPERIMENTS: ExperimentKF[] = [];

const useSetFilter = (
  setFilter: (filter?: PipelinesFilter) => void,
  filterData: FilterProps['filterData'],
  experiments: ExperimentKF[] = EMPTY_EXPERIMENTS,
  legacyExperimentRawId?: string,
  legacyExperimentId?: string,
) => {
  const doSetFilter = React.useCallback(
    (data: FilterProps['filterData']) => {
      const predicates: PipelinesFilterPredicate[] = [];
      const runName = getDataValue(data[FilterOptions.NAME]);
      const startedDateTime = getDataValue(data[FilterOptions.CREATED_AT]);
      const state = getDataValue(data[FilterOptions.STATUS]);
      const runGroupName = getDataValue(data[FilterOptions.RUN_GROUP]);
      const pipelineVersionId = getDataValue(data[FilterOptions.PIPELINE_VERSION]);

      if (runName) {
        predicates.push({
          key: 'name',
          operation: PipelinesFilterOp.IS_SUBSTRING,
          string_value: runName,
        });
      }

      if (startedDateTime) {
        predicates.push({
          key: 'created_at',
          operation: PipelinesFilterOp.GREATER_THAN_EQUALS,
          timestamp_value: new Date(startedDateTime).toISOString(),
        });
      }

      if (state) {
        predicates.push({
          key: 'state',
          operation: PipelinesFilterOp.EQUALS,
          string_value: state,
        });
      }

      const experimentPredicate = resolveExperimentPredicate(
        runGroupName,
        experiments,
        legacyExperimentRawId,
        legacyExperimentId,
      );
      if (experimentPredicate) {
        predicates.push(experimentPredicate);
      }

      if (pipelineVersionId) {
        predicates.push({
          key: 'pipeline_version_id',
          operation: PipelinesFilterOp.EQUALS,
          string_value: pipelineVersionId,
        });
      }

      setFilter(
        predicates.length > 0
          ? {
              predicates,
            }
          : undefined,
      );
    },
    [setFilter, experiments, legacyExperimentRawId, legacyExperimentId],
  );

  const doSetFilterDebounced = useDebounceCallback(doSetFilter);

  const {
    [FilterOptions.NAME]: name,
    [FilterOptions.CREATED_AT]: createdAt,
    [FilterOptions.STATUS]: state,
    [FilterOptions.PIPELINE_VERSION]: pipelineVersion,
    [FilterOptions.RUN_GROUP]: runGroup,
  } = filterData;

  const pipelineVersionId = getDataValue(pipelineVersion);

  React.useEffect(() => {
    doSetFilterDebounced(filterData);
    // debounce filter change for text input changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doSetFilterDebounced, name, runGroup]);

  React.useEffect(() => {
    doSetFilterDebounced.cancel();
    doSetFilter(filterData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdAt, state, pipelineVersionId, doSetFilter]);
};

const usePipelineFilter = (setFilter: (filter?: PipelinesFilter) => void): FilterProps => {
  const [filterData, setFilterData] = React.useState(defaultFilterData);
  useSetFilter(setFilter, filterData);

  const toolbarProps: FilterProps = {
    filterData,
    onFilterUpdate: React.useCallback(
      (key, value) => {
        setFilterData((oldValues) => ({ ...oldValues, [key]: value }));
      },
      [setFilterData],
    ),
    onClearFilters: React.useCallback(() => {
      setFilterData(defaultFilterData);
    }, [setFilterData]),
  };

  return toolbarProps;
};

export const usePipelineFilterSearchParams = (
  setFilter: (filter?: PipelinesFilter) => void,
): FilterProps => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { versions } = React.useContext(PipelineRunVersionsContext);
  const { experiments } = React.useContext(PipelineRunExperimentsContext);
  const { status: isMlflowAvailable } = useIsAreaAvailable(SupportedArea.MLFLOW_PIPELINES);

  const isLegacyParam =
    !searchParams.has(FilterOptions.RUN_GROUP) && searchParams.has(LEGACY_EXPERIMENT_FILTER_PARAM);

  const {
    filterData: filterDataFromSearchParams,
    legacyExperimentRawId,
    legacyExperimentId,
  } = React.useMemo(() => {
    const runGroupFromParams =
      searchParams.get(FilterOptions.RUN_GROUP) || searchParams.get(LEGACY_EXPERIMENT_FILTER_PARAM);
    const legacyExperimentRawIdFromParams = isLegacyParam
      ? searchParams.get(LEGACY_EXPERIMENT_FILTER_PARAM) || undefined
      : undefined;
    const versionFound = versions.find(
      (v) => v.pipeline_version_id === searchParams.get(FilterOptions.PIPELINE_VERSION),
    );
    const experimentFoundById = experiments.find((e) => e.experiment_id === runGroupFromParams);
    return {
      legacyExperimentRawId: legacyExperimentRawIdFromParams,
      legacyExperimentId:
        isLegacyParam && experimentFoundById ? experimentFoundById.experiment_id : undefined,
      filterData: {
        [FilterOptions.NAME]: searchParams.get(FilterOptions.NAME) || '',
        [FilterOptions.CREATED_AT]: searchParams.get(FilterOptions.CREATED_AT) || '',
        [FilterOptions.STATUS]: searchParams.get(FilterOptions.STATUS) || '',
        [FilterOptions.PIPELINE_VERSION]: versionFound
          ? {
              value: versionFound.pipeline_version_id,
              label: versionFound.display_name,
            }
          : searchParams.get(FilterOptions.PIPELINE_VERSION) || undefined,
        [FilterOptions.RUN_GROUP]: experimentFoundById
          ? experimentFoundById.display_name
          : runGroupFromParams || '',
        [FilterOptions.MLFLOW_EXPERIMENT]: isMlflowAvailable
          ? searchParams.get(FilterOptions.MLFLOW_EXPERIMENT) || ''
          : '',
      },
    };
  }, [experiments, isLegacyParam, isMlflowAvailable, searchParams, versions]);

  React.useEffect(() => {
    if (isMlflowAvailable || !searchParams.has(FilterOptions.MLFLOW_EXPERIMENT)) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(FilterOptions.MLFLOW_EXPERIMENT);
    setSearchParams(nextParams, { replace: true });
  }, [isMlflowAvailable, searchParams, setSearchParams]);

  useSetFilter(
    setFilter,
    filterDataFromSearchParams,
    experiments,
    legacyExperimentRawId,
    legacyExperimentId,
  );

  const toolbarProps: FilterProps = {
    filterData: filterDataFromSearchParams,
    onFilterUpdate: React.useCallback(
      (key, value) => {
        const data = getDataValue(value);
        if (!data) {
          searchParams.delete(key);
        } else {
          searchParams.set(key, data);
        }
        if (key === FilterOptions.RUN_GROUP) {
          searchParams.delete(LEGACY_EXPERIMENT_FILTER_PARAM);
        }
        setSearchParams(searchParams, { replace: true });
      },
      [setSearchParams, searchParams],
    ),
    onClearFilters: React.useCallback(() => {
      // In case of deleting manage run search params
      Object.values(FilterOptions).forEach((value) => searchParams.delete(value));
      searchParams.delete(LEGACY_EXPERIMENT_FILTER_PARAM);
      setSearchParams(searchParams, { replace: true });
    }, [setSearchParams, searchParams]),
  };

  return toolbarProps;
};

export default usePipelineFilter;
