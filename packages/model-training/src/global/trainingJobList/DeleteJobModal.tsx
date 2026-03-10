import React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { getUnifiedJobStatusSync } from './utils';
import { TrainingJobState, UnifiedJobKind, isRayJob } from '../../types';
import { deleteTrainJob, deleteRayJob } from '../../api';

export type DeleteJobModalProps = {
  job: UnifiedJobKind;
  onClose: (deleted: boolean) => void;
};

const DeleteJobModal: React.FC<DeleteJobModalProps> = ({ job, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = job.metadata.name;
  const status = getUnifiedJobStatusSync(job);

  const isTerminalState =
    status === TrainingJobState.SUCCEEDED || status === TrainingJobState.FAILED;

  const performDelete = isRayJob(job) ? deleteRayJob : deleteTrainJob;

  return (
    <DeleteModal
      title="Delete job?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        performDelete(job.metadata.name, job.metadata.namespace)
          .then(() => {
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      The <strong>{deleteName}</strong> job will be deleted.
      {!isTerminalState && ' Any running pods will be terminated.'}
    </DeleteModal>
  );
};

export default DeleteJobModal;
