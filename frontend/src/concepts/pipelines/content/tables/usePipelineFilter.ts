import * as React from 'react';
import { FilterProps } from '~/concepts/pipelines/content/tables/PipelineFilterBar';
import {
  PipelineRunStatusesKF,
  PipelinesFilterOp,
  PipelinesFilterPredicate,
  ResourceKeyKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';

import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';

export enum FilterOptions {
  NAME = 'name',
  CREATED_AT = 'create_at',
  STATUS = 'status',
  EXPERIMENT = 'experiment',
  PIPELINE_VERSION = 'pipeline_version',
}

const statusMap: {
  Failed?: string[];
  Started?: PipelineRunStatusesKF;
  Running?: PipelineRunStatusesKF;
  Completed?: string[];
  Cancelled?: PipelineRunStatusesKF;
} = {
  [PipelineRunStatusesKF.FAILED]: [
    PipelineRunStatusesKF.FAILED,
    'PipelineRunTimeout',
    'CreateRunFailed',
  ],
  [PipelineRunStatusesKF.STARTED]: PipelineRunStatusesKF.STARTED,
  [PipelineRunStatusesKF.RUNNING]: PipelineRunStatusesKF.RUNNING,
  [PipelineRunStatusesKF.COMPLETED]: [PipelineRunStatusesKF.COMPLETED, 'Succeeded'],
  [PipelineRunStatusesKF.CANCELLED]: PipelineRunStatusesKF.CANCELLED,
};

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
      let resourceReference: ResourceKeyKF | undefined = undefined;

      const runValue = getDataValue(data[FilterOptions.NAME]);
      const startedValue = getDataValue(data[FilterOptions.CREATED_AT]);
      const statusValue = getDataValue(data[FilterOptions.STATUS]);
      const experimentValue = getDataValue(data[FilterOptions.EXPERIMENT]);
      const pipelineVersionValue = getDataValue(data[FilterOptions.PIPELINE_VERSION]);

      if (runValue) {
        predicates.push({
          key: 'name',
          op: PipelinesFilterOp.IS_SUBSTRING,
          // eslint-disable-next-line camelcase
          string_value: runValue,
        });
      }
      if (startedValue) {
        predicates.push({
          key: 'created_at',
          op: PipelinesFilterOp.GREATER_THAN_EQUALS,
          // eslint-disable-next-line camelcase
          timestamp_value: new Date(startedValue).toISOString(),
        });
      }
      if (statusValue) {
        const predicateValue = statusMap[statusValue as PipelineRunStatusesKF] ?? statusValue;
        if (Array.isArray(predicateValue)) {
          predicates.push({
            key: 'status',
            op: PipelinesFilterOp.IN,
            // eslint-disable-next-line camelcase
            string_values: { values: predicateValue },
          });
        } else {
          predicates.push({
            key: 'status',
            op: PipelinesFilterOp.EQUALS,
            // eslint-disable-next-line camelcase
            string_value: predicateValue,
          });
        }
      }

      if (experimentValue) {
        resourceReference = { type: ResourceTypeKF.EXPERIMENT, id: experimentValue };
      }

      if (pipelineVersionValue) {
        resourceReference = { type: ResourceTypeKF.PIPELINE_VERSION, id: pipelineVersionValue };
      }

      setFilter(
        predicates.length > 0 || !!resourceReference
          ? {
              resourceReference,
              predicates,
            }
          : undefined,
      );
    },
    [setFilter],
  );

  const doSetFilterDebounced = useDebounceCallback(doSetFilter);
  const {
    [FilterOptions.CREATED_AT]: createdAtFilter,
    [FilterOptions.STATUS]: statusFilter,
    [FilterOptions.PIPELINE_VERSION]: pipelineVersionFilter,
  } = filterData;

  React.useEffect(() => {
    doSetFilterDebounced(filterData);
    // debounce filter change for name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterData[FilterOptions.NAME], doSetFilterDebounced]);

  React.useEffect(() => {
    doSetFilterDebounced.cancel();
    doSetFilter(filterData);
    // perform filter change immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdAtFilter, statusFilter, pipelineVersionFilter, doSetFilter]);

  return toolbarProps;
};

export default usePipelineFilter;
