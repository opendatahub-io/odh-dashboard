import * as React from 'react';
import JobsTable from './JobsTable';
import JobsToolbar from './JobsToolbar';
import { initialJobsFilterData, JobsFilterDataType } from './const';
import { filterJob } from './utils';
import { UnifiedJobKind, TrainingJobState } from '../../types';

type JobsListViewProps = {
  jobs: UnifiedJobKind[];
  jobStatuses: Map<string, TrainingJobState>;
  nodeCountMap: Map<string, number>;
  onStatusUpdate: (jobId: string, newStatus: TrainingJobState) => void;
  onSelectJob: (job: UnifiedJobKind) => void;
  onDelete: (job: UnifiedJobKind) => void;
  togglingJobId?: string;
};

const JobsListView: React.FC<JobsListViewProps> = ({
  jobs: unfilteredJobs,
  jobStatuses,
  nodeCountMap,
  onStatusUpdate,
  onSelectJob,
  onDelete,
  togglingJobId,
}) => {
  const [filterData, setFilterData] = React.useState<JobsFilterDataType>(initialJobsFilterData);

  const onClearFilters = React.useCallback(
    () => setFilterData(initialJobsFilterData),
    [setFilterData],
  );

  const filteredJobs = React.useMemo(
    () => unfilteredJobs.filter((job) => filterJob(job, filterData, jobStatuses)),
    [filterData, unfilteredJobs, jobStatuses],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <JobsTable
      jobs={filteredJobs}
      jobStatuses={jobStatuses}
      nodeCountMap={nodeCountMap}
      onStatusUpdate={onStatusUpdate}
      onSelectJob={onSelectJob}
      onDelete={onDelete}
      onClearFilters={onClearFilters}
      clearFilters={Object.values(filterData).some((value) => !!value) ? onClearFilters : undefined}
      toolbarContent={<JobsToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />}
      togglingJobId={togglingJobId}
    />
  );
};

export default JobsListView;
