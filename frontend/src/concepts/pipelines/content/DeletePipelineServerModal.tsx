import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { deletePipelineCR, deleteSecret, getSecret } from '~/api';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type DeletePipelineServerModalProps = {
  isOpen: boolean;
  onClose: (deleted: boolean) => void;
};

const DeletePipelineServerModal: React.FC<DeletePipelineServerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { project, namespace } = usePipelinesAPI();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
  };

  const deleteName = `${getProjectDisplayName(project)} pipeline server`;

  return (
    <DeleteModal
      title="Delete pipeline server?"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      deleting={deleting}
      error={error}
      onDelete={() => {
        setDeleting(true);
        Promise.all([
          new Promise((resolve, reject) => {
            // if the secret doesn't exist, catch and resolve
            // else delete the secret, reject if error
            getSecret(project.metadata.name, 'pipelines-db-password')
              .then(() =>
                deleteSecret(project.metadata.name, 'pipelines-db-password')
                  .then(resolve)
                  .catch(reject),
              )
              .catch(resolve);
          }),
          deletePipelineCR(namespace),
        ])
          .then(() => onBeforeClose(true))
          .catch((e) => {
            onBeforeClose(false);
            setError(e);
          });
      }}
      submitButtonLabel="Delete"
      deleteName={deleteName}
    >
      The <b>{deleteName}</b> and all of its pipelines and runs will be deleted from{' '}
      <b>{deleteName}</b>. You will not be able to create new pipelines or pipeline runs until you
      create a new pipeline server.
    </DeleteModal>
  );
};

export default DeletePipelineServerModal;
