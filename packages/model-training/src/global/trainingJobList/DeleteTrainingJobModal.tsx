import React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { getTrainingJobStatusSync } from './utils';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { deleteTrainJob } from '../../api';

export type DeleteTrainingJobModalProps = {
  trainingJob: TrainJobKind;
  onClose: (deleted: boolean) => void;
};

const DeleteTrainingJobModal: React.FC<DeleteTrainingJobModalProps> = ({
  trainingJob,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = trainingJob.metadata.name;
  const status = getTrainingJobStatusSync(trainingJob);

  const isTerminalState =
    status === TrainingJobState.SUCCEEDED || status === TrainingJobState.FAILED;

  return (
    <DeleteModal
      title="Delete job?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        deleteTrainJob(trainingJob.metadata.name, trainingJob.metadata.namespace)
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

export default DeleteTrainingJobModal;
