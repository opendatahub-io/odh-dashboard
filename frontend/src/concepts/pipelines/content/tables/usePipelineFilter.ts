/* eslint-disable camelcase */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PipelinesFilterOp, PipelinesFilterPredicate } from '#~/concepts/pipelines/kfTypes';

import { PipelinesFilter } from '#~/concepts/pipelines/types';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import FilterToolbar from '#~/components/FilterToolbar';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';

export enum FilterOptions {
  NAME = 'name',
  CREATED_AT = 'create_at',
  STATUS = 'status',
  EXPERIMENT = 'experiment',
  PIPELINE_VERSION = 'pipeline_version',
}

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
  [FilterOptions.EXPERIMENT]: undefined,
  [FilterOptions.PIPELINE_VERSION]: undefined,
};

const useSetFilter = (
  setFilter: (filter?: PipelinesFilter) => void,
  filterData: FilterProps['filterData'],
) => {
  const doSetFilter = React.useCallback(
    (data: FilterProps['filterData']) => {
      const predicates: PipelinesFilterPredicate[] = [];
      const runName = getDataValue(data[FilterOptions.NAME]);
      const startedDateTime = getDataValue(data[FilterOptions.CREATED_AT]);
      const state = getDataValue(data[FilterOptions.STATUS]);
      const experimentId = getDataValue(data[FilterOptions.EXPERIMENT]);
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

      if (experimentId) {
        predicates.push({
          key: 'experiment_id',
          operation: PipelinesFilterOp.EQUALS,
          string_value: experimentId,
        });
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
    [setFilter],
  );

  const doSetFilterDebounced = useDebounceCallback(doSetFilter);

  const {
    [FilterOptions.NAME]: name,
    [FilterOptions.CREATED_AT]: createdAt,
    [FilterOptions.STATUS]: state,
    [FilterOptions.PIPELINE_VERSION]: pipelineVersion,
    [FilterOptions.EXPERIMENT]: experiment,
  } = filterData;

  const pipelineVersionId = getDataValue(pipelineVersion);
  const experimentId = getDataValue(experiment);

  React.useEffect(() => {
    doSetFilterDebounced(filterData);
    // debounce filter change for name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doSetFilterDebounced, name]);

  React.useEffect(() => {
    doSetFilterDebounced.cancel();
    doSetFilter(filterData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdAt, state, pipelineVersionId, experimentId, doSetFilter]);
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

  const filterDataFromSearchParams = React.useMemo(() => {
    const versionFound = versions.find(
      (v) => v.pipeline_version_id === searchParams.get(FilterOptions.PIPELINE_VERSION),
    );
    const experimentFound = experiments.find(
      (e) => e.experiment_id === searchParams.get(FilterOptions.EXPERIMENT),
    );
    return {
      [FilterOptions.NAME]: searchParams.get(FilterOptions.NAME) || '',
      [FilterOptions.CREATED_AT]: searchParams.get(FilterOptions.CREATED_AT) || '',
      [FilterOptions.STATUS]: searchParams.get(FilterOptions.STATUS) || '',
      [FilterOptions.PIPELINE_VERSION]: versionFound
        ? {
            value: versionFound.pipeline_version_id,
            label: versionFound.display_name,
          }
        : searchParams.get(FilterOptions.PIPELINE_VERSION) || undefined,
      [FilterOptions.EXPERIMENT]: experimentFound
        ? {
            value: experimentFound.experiment_id,
            label: experimentFound.display_name,
          }
        : searchParams.get(FilterOptions.EXPERIMENT) || undefined,
    };
  }, [experiments, searchParams, versions]);

  useSetFilter(setFilter, filterDataFromSearchParams);

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
        setSearchParams(searchParams, { replace: true });
      },
      [setSearchParams, searchParams],
    ),
    onClearFilters: React.useCallback(() => {
      // In case of deleting manage run search params
      Object.values(FilterOptions).forEach((value) => searchParams.delete(value));
      setSearchParams(searchParams, { replace: true });
    }, [setSearchParams, searchParams]),
  };

  return toolbarProps;
};

export default usePipelineFilter;
