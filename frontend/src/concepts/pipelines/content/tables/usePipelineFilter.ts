/* eslint-disable camelcase */
import * as React from 'react';
import { FilterProps } from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import { PipelinesFilterOp, PipelinesFilterPredicate } from '~/concepts/pipelines/kfTypes';

import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';

export enum FilterOptions {
  NAME = 'name',
  CREATED_AT = 'create_at',
  STATUS = 'status',
  EXPERIMENT = 'experiment',
  PIPELINE_VERSION = 'pipeline_version',
}

export const getDataValue = <T extends FilterProps['filterData'], R = T[keyof T]>(
  data: R,
): string | undefined => {
  if (typeof data === 'string') {
    return data;
  }
  return (data as { label: string; value: string } | undefined)?.value;
};

const defaultValue: FilterProps['filterData'] = {
  [FilterOptions.NAME]: '',
  [FilterOptions.CREATED_AT]: '',
  [FilterOptions.STATUS]: '',
  [FilterOptions.EXPERIMENT]: undefined,
  [FilterOptions.PIPELINE_VERSION]: '',
};

const usePipelineFilter = (setFilter: (filter?: PipelinesFilter) => void): FilterProps => {
  const [filterData, setFilterData] = React.useState(defaultValue);

  const toolbarProps: FilterProps = {
    filterData,
    onFilterUpdate: React.useCallback(
      (key, value) => setFilterData((oldValues) => ({ ...oldValues, [key]: value })),
      [],
    ),
    onClearFilters: React.useCallback(() => setFilterData(defaultValue), []),
  };

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
    [FilterOptions.PIPELINE_VERSION]: pipelineVersionId,
    [FilterOptions.EXPERIMENT]: experimentId,
  } = filterData;

  React.useEffect(() => {
    doSetFilterDebounced(filterData);
    // debounce filter change for name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, doSetFilterDebounced]);

  React.useEffect(() => {
    doSetFilterDebounced.cancel();
    doSetFilter(filterData);
    // perform filter change immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdAt, state, pipelineVersionId, experimentId, doSetFilter]);

  return toolbarProps;
};

export default usePipelineFilter;
