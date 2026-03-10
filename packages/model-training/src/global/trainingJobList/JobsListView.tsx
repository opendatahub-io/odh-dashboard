import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import JobsTable from './JobsTable';
import JobsToolbar from './JobsToolbar';
import { initialJobsFilterData, JobsFilterDataType } from './const';
import { getStatusInfo, getUnifiedJobStatusSync } from './utils';
import { UnifiedJobKind, TrainingJobState } from '../../types';
import { KUEUE_QUEUE_LABEL } from '../../const';

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
    () =>
      unfilteredJobs.filter((job) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const statusFilter = filterData.Status?.toLowerCase();
        const clusterQueueFilter = filterData['Cluster queue']?.toLowerCase();

        if (nameFilter && !getDisplayNameFromK8sResource(job).toLowerCase().includes(nameFilter)) {
          return false;
        }

        if (statusFilter) {
          const jobId = job.metadata.uid || job.metadata.name;
          const jobStatus = jobStatuses.get(jobId) || getUnifiedJobStatusSync(job);
          const statusLabel = getStatusInfo(jobStatus).label;
          if (!statusLabel.toLowerCase().includes(statusFilter)) {
            return false;
          }
        }

        if (
          clusterQueueFilter &&
          !(job.metadata.labels?.[KUEUE_QUEUE_LABEL] || '')
            .toLowerCase()
            .includes(clusterQueueFilter)
        ) {
          return false;
        }

        return true;
      }),
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
