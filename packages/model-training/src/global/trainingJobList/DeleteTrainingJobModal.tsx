import React from 'react';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { PyTorchJobKind } from '../../k8sTypes';
import { deletePyTorchJob } from '../../api';

export type DeleteTrainingJobModalProps = {
  trainingJob: PyTorchJobKind;
  onClose: (deleted: boolean) => void;
};

const DeleteTrainingJobModal: React.FC<DeleteTrainingJobModalProps> = ({
  trainingJob,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  console.log('trainingJob', trainingJob);

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = trainingJob.metadata.name;

  return (
    <DeleteModal
      title="Delete training job?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete training job"
      onDelete={() => {
        setIsDeleting(true);
        deletePyTorchJob(trainingJob.metadata.name, trainingJob.metadata.namespace)
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
      This action cannot be undone. All training data and progress will be lost.
    </DeleteModal>
  );
};

export default DeleteTrainingJobModal;
