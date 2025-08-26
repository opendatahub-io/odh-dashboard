import * as React from 'react';
import { Table } from '@odh-dashboard/internal/components/table/index';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { columns } from './const';
import DeleteTrainingJobModal from './DeleteTrainingJobModal';
import TrainingJobTableRow from './TrainingJobTableRow';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';

type TrainingJobTableProps = {
  trainingJobs: PyTorchJobKind[];
  jobStatuses?: Map<string, PyTorchJobState>; // Batch fetched statuses
  onStatusUpdate?: (jobId: string, newStatus: PyTorchJobState) => void;
  clearFilters?: () => void;
  onClearFilters: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const TrainingJobTable: React.FC<TrainingJobTableProps> = ({
  trainingJobs,
  jobStatuses,
  onStatusUpdate,
  clearFilters,
  onClearFilters,
  toolbarContent,
}) => {
  const [deleteTrainingJob, setDeleteTrainingJob] = React.useState<PyTorchJobKind>();

  return (
    <>
      <Table
        data-testid="training-job-table"
        id="training-job-table"
        enablePagination
        data={trainingJobs}
        columns={columns}
        onClearFilters={onClearFilters}
        toolbarContent={toolbarContent}
        emptyTableView={
          clearFilters ? <DashboardEmptyTableView onClearFilters={clearFilters} /> : undefined
        }
        rowRenderer={(job: PyTorchJobKind) => {
          const jobId = job.metadata.uid || job.metadata.name;
          const jobStatus = jobStatuses?.get(jobId);

          return (
            <TrainingJobTableRow
              key={jobId}
              job={job}
              jobStatus={jobStatus}
              onStatusUpdate={onStatusUpdate}
              onDelete={(trainingJob) => setDeleteTrainingJob(trainingJob)}
            />
          );
        }}
      />

      {deleteTrainingJob ? (
        <DeleteTrainingJobModal
          trainingJob={deleteTrainingJob}
          onClose={() => {
            setDeleteTrainingJob(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default TrainingJobTable;
