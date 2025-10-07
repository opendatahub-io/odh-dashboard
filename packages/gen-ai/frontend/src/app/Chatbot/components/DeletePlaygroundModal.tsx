import * as React from 'react';
import { deleteLSD } from '~/app/services/llamaStackService';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import DeleteModal from '~/app/shared/DeleteModal';

type DeletePlaygroundModalProps = {
  onCancel: () => void;
};

const DeletePlaygroundModal: React.FC<DeletePlaygroundModalProps> = ({ onCancel }) => {
  const { namespace } = React.useContext(GenAiContext);
  const { lsdStatus, refresh } = React.useContext(ChatbotContext);
  const [isDeleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  return (
    <DeleteModal
      title="Delete playground?"
      onClose={onCancel}
      deleting={isDeleting}
      error={error}
      onDelete={async () => {
        setDeleting(true);
        if (namespace?.name && lsdStatus?.name) {
          deleteLSD(namespace.name, lsdStatus.name)
            .then(() => {
              onCancel();
              refresh();
            })
            .catch((e) => {
              setError(e);
            })
            .finally(() => {
              setDeleting(false);
            });
        }
      }}
      submitButtonLabel="Delete"
      deleteName={namespace?.displayName || 'playground'}
    >
      This action cannot be undone. This will delete the playground for all users in this project.
    </DeleteModal>
  );
};

export default DeletePlaygroundModal;
