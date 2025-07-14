import React from 'react';
import DeleteModal from '#~/pages/projects/components/DeleteModal';

type DeleteTrustyAIModalProps = {
  onDelete: () => Promise<unknown>;
  onClose: (deleted: boolean) => void;
};

const DeleteTrustyAIModal: React.FC<DeleteTrustyAIModalProps> = ({ onDelete, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  return (
    <DeleteModal
      title="Uninstall TrustyAI"
      onClose={() => {
        setIsDeleting(false);
        setError(undefined);
        onClose(false);
      }}
      deleting={isDeleting}
      onDelete={() => {
        setIsDeleting(true);
        onDelete()
          .then(() => onClose(true))
          .catch((e) => setError(e))
          .finally(() => setIsDeleting(false));
      }}
      error={error}
      deleteName="trustyai"
      submitButtonLabel="Uninstall"
    >
      Disabling model bias monitoring will uninstall TrustyAI from your namespace. All associated
      data, such as model bias configurations, will be deleted.
    </DeleteModal>
  );
};

export default DeleteTrustyAIModal;
