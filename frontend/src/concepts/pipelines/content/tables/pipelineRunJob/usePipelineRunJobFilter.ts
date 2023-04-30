import * as React from 'react';
import {
  FilterOptions,
  FilterProps,
} from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableToolbar';
import {
  getPipelineRunLikeExperimentName,
  getPipelineRunLikePipelineName,
  isJobWithinDateRange,
} from '~/concepts/pipelines/content/tables/utils';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';

type FilterData = Record<FilterOptions, string>;
const DEFAULT_FILTER_DATA: FilterData = {
  [FilterOptions.NAME]: '',
  [FilterOptions.EXPERIMENT]: '',
  [FilterOptions.PIPELINE]: '',
  [FilterOptions.SCHEDULED]: '',
  [FilterOptions.STATUS]: '',
};

const usePipelineRunJobFilter = (
  jobs: PipelineRunJobKF[],
): [filterJobs: PipelineRunJobKF[], toolbarProps: FilterProps] => {
  const [filterData, setFilterData] = React.useState<FilterData>(DEFAULT_FILTER_DATA);

  const filterJobs = jobs.filter((job) => {
    const runValue = filterData[FilterOptions.NAME];
    const experimentValue = filterData[FilterOptions.EXPERIMENT];
    const pipelineValue = filterData[FilterOptions.PIPELINE];
    const scheduledRangeValue = filterData[FilterOptions.SCHEDULED];
    const statusValue = filterData[FilterOptions.STATUS];

    if (runValue && !job.name.toLowerCase().includes(runValue.toLowerCase())) {
      return false;
    }
    if (
      experimentValue &&
      !getPipelineRunLikeExperimentName(job).toLowerCase().includes(experimentValue.toLowerCase())
    ) {
      return false;
    }
    if (
      pipelineValue &&
      !getPipelineRunLikePipelineName(job).toLowerCase().includes(pipelineValue.toLowerCase())
    ) {
      return false;
    }
    if (scheduledRangeValue && !isJobWithinDateRange(job, scheduledRangeValue)) {
      return false;
    }
    if (statusValue) {
      // KF removes the enabled prop when it doesn't exist
      const statusValueAsKF = statusValue === 'Enabled' ? true : undefined;
      if (job.enabled !== statusValueAsKF) {
        return false;
      }
    }

    return true;
  });

  const toolbarProps: FilterProps = {
    filterData: filterData,
    onFilterUpdate: (key, value) => setFilterData((oldValues) => ({ ...oldValues, [key]: value })),
    onClearFilters: () => setFilterData(DEFAULT_FILTER_DATA),
  };

  return [filterJobs, toolbarProps];
};

export default usePipelineRunJobFilter;
