import React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import useManageTrustyAICR from '~/concepts/explainability/useManageTrustyAICR';

type TrustyAIDeleteModalProps = {
  namespace: string;
  isOpen: boolean;
  onClose: (deleted: boolean) => void;
};

const TrustyAIDeleteModal: React.FC<TrustyAIDeleteModalProps> = ({
  namespace,
  isOpen,
  onClose,
}) => {
  const { deleteCR } = useManageTrustyAICR(namespace);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  return (
    <DeleteModal
      title="Uninstall TrustyAI Service"
      isOpen={isOpen}
      onClose={() => {
        setIsDeleting(false);
        setError(undefined);
        onClose(false);
      }}
      deleting={isDeleting}
      onDelete={() => {
        setIsDeleting(true);
        deleteCR()
          .then(() => onClose(true))
          .catch((e) => setError(e))
          .finally(() => setIsDeleting(false));
      }}
      error={error}
      deleteName="trustyai"
      submitButtonLabel="Uninstall"
    >
      This will uninstall the TrustyAI service from this project and all associated data, such as
      model bias configurations.
    </DeleteModal>
  );
};

export default TrustyAIDeleteModal;
