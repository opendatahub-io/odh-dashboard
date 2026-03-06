import * as React from 'react';
import { Table } from '@odh-dashboard/internal/components/table/index';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { columns } from './const';
import DeleteTrainingJobModal from './DeleteTrainingJobModal';
import TrainJobTableRow from './TrainJobTableRow';
import RayJobTableRow from './RayJobTableRow';
import { TrainJobKind, RayJobKind } from '../../k8sTypes';
import { TrainingJobState, UnifiedJobKind, isRayJob, isTrainJob } from '../../types';
import { deleteRayJob } from '../../api';

type JobsTableProps = {
  jobs: UnifiedJobKind[];
  jobStatuses?: Map<string, TrainingJobState>;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  onSelectJob: (job: UnifiedJobKind) => void;
  clearFilters?: () => void;
  onClearFilters: () => void;
  togglingJobId?: string;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  jobStatuses,
  onStatusUpdate,
  onSelectJob,
  clearFilters,
  onClearFilters,
  toolbarContent,
  togglingJobId,
}) => {
  const [deleteJob, setDeleteJob] = React.useState<TrainJobKind>();

  return (
    <>
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
                onSelectJob={(j) => onSelectJob(j)}
                onDelete={(j: RayJobKind) => {
                  deleteRayJob(j.metadata.name, j.metadata.namespace);
                }}
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
                onDelete={(trainingJob) => setDeleteJob(trainingJob)}
                isExternallyToggling={isExternallyToggling}
              />
            );
          }

          return null;
        }}
      />

      {deleteJob ? (
        <DeleteTrainingJobModal
          trainingJob={deleteJob}
          onClose={() => {
            setDeleteJob(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default JobsTable;
