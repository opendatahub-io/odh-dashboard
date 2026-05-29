import * as React from 'react';
import { Table } from '@odh-dashboard/internal/components/table/index';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { getColumns } from './const';
import TrainJobTableRow from './TrainJobTableRow';
import RayJobTableRow from './RayJobTableRow';
import { JobDisplayState, UnifiedJobKind, isRayJob, isTrainJob } from '../../types';

type JobsTableProps = {
  jobs: UnifiedJobKind[];
  jobStatuses?: Map<string, JobDisplayState>;
  isLoadingStatus?: boolean;
  nodeCountMap: Map<string, number>;
  onStatusUpdate?: (jobId: string, newStatus: JobDisplayState) => void;
  onSelectJob: (job: UnifiedJobKind) => void;
  onDelete: (job: UnifiedJobKind) => void;
  clearFilters?: () => void;
  onClearFilters: () => void;
  togglingJobId?: string;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  jobStatuses,
  isLoadingStatus,
  nodeCountMap,
  onStatusUpdate,
  onSelectJob,
  onDelete,
  clearFilters,
  onClearFilters,
  toolbarContent,
  togglingJobId,
}) => {
  const columns = React.useMemo(() => getColumns(nodeCountMap), [nodeCountMap]);

  return (
    <Table
      data-testid="training-job-table"
      id="training-job-table"
      enablePagination
      data={jobs}
      columns={columns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={
        clearFilters ? <DashboardEmptyTableView onClearFilters={clearFilters} /> : undefined
      }
      rowRenderer={(job: UnifiedJobKind) => {
        const jobId = job.metadata.uid || job.metadata.name;
        const jobStatus = jobStatuses?.get(jobId);
        const isExternallyToggling = togglingJobId === jobId;

        if (isRayJob(job)) {
          return (
            <RayJobTableRow
              key={jobId}
              job={job}
              jobStatus={jobStatus}
              isLoadingStatus={isLoadingStatus}
              nodeCount={nodeCountMap.get(jobId) ?? 0}
              onStatusUpdate={onStatusUpdate}
              onSelectJob={(j) => onSelectJob(j)}
              onDelete={(j) => onDelete(j)}
              isExternallyToggling={isExternallyToggling}
            />
          );
        }

        if (isTrainJob(job)) {
          return (
            <TrainJobTableRow
              key={jobId}
              job={job}
              jobStatus={jobStatus}
              onStatusUpdate={onStatusUpdate}
              onSelectJob={(j) => onSelectJob(j)}
              onDelete={(trainingJob) => onDelete(trainingJob)}
              isExternallyToggling={isExternallyToggling}
            />
          );
        }

        return null;
      }}
    />
  );
};

export default JobsTable;
