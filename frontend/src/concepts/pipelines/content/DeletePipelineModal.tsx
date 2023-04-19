import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type DeletePipelineModalProps = {
  pipeline: PipelineKF | null;
  onClose: (deleted: boolean) => void;
};

const DeletePipelineModal: React.FC<DeletePipelineModalProps> = ({ pipeline, onClose }) => {
  const { api } = usePipelinesAPI();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
  };

  return (
    <DeleteModal
      title="Delete pipeline"
      isOpen={!!pipeline}
      onClose={() => onBeforeClose(false)}
      deleting={deleting}
      error={error}
      onDelete={() => {
        if (pipeline) {
          setDeleting(true);
          api
            .deletePipeline({}, pipeline.id)
            .then(() => {
              setDeleting(false);
              onBeforeClose(true);
            })
            .catch((e) => {
              setDeleting(false);
              setError(e);
            });
        }
      }}
      submitButtonLabel="Delete pipeline"
      deleteName={pipeline ? pipeline.name : 'Pipeline'}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeletePipelineModal;
