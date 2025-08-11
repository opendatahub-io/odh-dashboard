import * as React from 'react';
import { Table } from '@odh-dashboard/internal/components/table/index';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { columns } from './const';
import TrainingJobTableRow from './TrainingJobTableRow';
import DeleteTrainingJobModal from './DeleteTrainingJobModal';
import { PyTorchJobKind } from '../../k8sTypes';

type TrainingJobTableProps = {
  trainingJobs: PyTorchJobKind[];
  clearFilters?: () => void;
  onClearFilters: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const TrainingJobTable: React.FC<TrainingJobTableProps> = ({
  trainingJobs,
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
        rowRenderer={(job: PyTorchJobKind) => (
          <TrainingJobTableRow
            key={job.metadata.uid || job.metadata.name}
            job={job}
            onDelete={(trainingJob) => setDeleteTrainingJob(trainingJob)}
          />
        )}
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
