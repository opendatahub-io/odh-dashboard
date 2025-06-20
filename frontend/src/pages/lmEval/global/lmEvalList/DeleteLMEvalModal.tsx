import React from 'react';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { LMEvalKind } from '#~/k8sTypes.ts';
import { deleteModelEvaluation } from '#~/api/k8s/lmEval.ts';

export type DeleteLMEvalModalProps = {
  lmEval: LMEvalKind;
  onClose: (deleted: boolean) => void;
};

const DeleteLMEvalModal: React.FC<DeleteLMEvalModalProps> = ({ lmEval, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = lmEval.metadata.name;

  return (
    <DeleteModal
      title="Delete model evaluation?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete model evaluation"
      onDelete={() => {
        setIsDeleting(true);
        deleteModelEvaluation(lmEval.metadata.name, lmEval.metadata.namespace)
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
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteLMEvalModal;
