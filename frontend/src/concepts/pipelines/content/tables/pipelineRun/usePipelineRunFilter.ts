import * as React from 'react';
import {
  getPipelineRunLikeExperimentName,
  getPipelineRunLikePipelineName,
} from '~/concepts/pipelines/content/tables/utils';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { FilterOptions, FilterProps } from './PipelineRunTableToolbar';

type FilterData = Record<FilterOptions, string>;
const DEFAULT_FILTER_DATA: FilterData = {
  [FilterOptions.NAME]: '',
  [FilterOptions.EXPERIMENT]: '',
  [FilterOptions.PIPELINE]: '',
  [FilterOptions.STARTED]: '',
  [FilterOptions.STATUS]: '',
};

const usePipelineRunFilter = (
  runs: PipelineRunKF[],
): [filterJobs: PipelineRunKF[], toolbarProps: FilterProps] => {
  const [filterData, setFilterData] = React.useState<FilterData>(DEFAULT_FILTER_DATA);

  const filteredRuns = runs.filter((run) => {
    const runValue = filterData[FilterOptions.NAME];
    const experimentValue = filterData[FilterOptions.EXPERIMENT];
    const pipelineValue = filterData[FilterOptions.PIPELINE];
    const startedValue = filterData[FilterOptions.STARTED];
    const statusValue = filterData[FilterOptions.STATUS];

    if (runValue && !run.name.includes(runValue)) {
      return false;
    }
    if (
      experimentValue &&
      !getPipelineRunLikeExperimentName(run).toLowerCase().includes(experimentValue.toLowerCase())
    ) {
      return false;
    }
    if (
      pipelineValue &&
      !getPipelineRunLikePipelineName(run).toLowerCase().includes(pipelineValue.toLowerCase())
    ) {
      return false;
    }
    if (startedValue && !run.created_at.includes(startedValue)) {
      return false;
    }
    if (statusValue && run.status !== statusValue) {
      return false;
    }

    return true;
  });

  const toolbarProps: FilterProps = {
    filterData: filterData,
    onFilterUpdate: (key, value) => setFilterData((oldValues) => ({ ...oldValues, [key]: value })),
    onClearFilters: () => setFilterData(DEFAULT_FILTER_DATA),
  };

  return [filteredRuns, toolbarProps];
};

export default usePipelineRunFilter;
