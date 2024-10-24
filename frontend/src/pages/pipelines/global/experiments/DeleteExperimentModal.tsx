import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';

type DeleteExperimentModalProps = {
  experiment: ExperimentKF;
  onCancel: () => void;
};

const DeleteExperimentModal: React.FC<DeleteExperimentModalProps> = ({ experiment, onCancel }) => {
  const [isDeleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { api, refreshAllAPI } = usePipelinesAPI();

  return (
    <DeleteModal
      title="Delete experiment?"
      onClose={onCancel}
      deleting={isDeleting}
      error={error}
      onDelete={async () => {
        setDeleting(true);
        try {
          await api.deleteExperiment({}, experiment.experiment_id);
          refreshAllAPI();
          setDeleting(false);
          onCancel();
        } catch (e) {
          if (e instanceof Error) {
            setError(e);
          }
          setDeleting(false);
        }
      }}
      submitButtonLabel="Delete"
      deleteName={experiment.display_name}
    >
      <b>{experiment.display_name}</b> and all of its resources will be deleted.
    </DeleteModal>
  );
};

export default DeleteExperimentModal;
