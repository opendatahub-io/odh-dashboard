import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalBody,
  ModalFooter,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import type { PipelineRun } from '~/app/types';

type DeletePipelineRunModalProps = {
  isOpen: boolean;
  run: PipelineRun | null;
  onClose: (deleted: boolean) => void;
  onConfirm: () => Promise<void>;
};

const DeletePipelineRunModal: React.FC<DeletePipelineRunModalProps> = ({
  isOpen,
  run,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (!run) {
      return;
    }
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose(true);
    } catch {
      onClose(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      variant={ModalVariant.small}
      title="Delete pipeline run"
      isOpen={isOpen && run !== null}
      onClose={() => onClose(false)}
      aria-label="Delete pipeline run"
    >
      {run && (
        <ModalBody>
          <p>
            Are you sure you want to delete run &quot;{run.name}&quot;? This action cannot be
            undone.
          </p>
        </ModalBody>
      )}
      <ModalFooter>
        <Button variant={ButtonVariant.link} onClick={() => onClose(false)} isDisabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant={ButtonVariant.danger}
          onClick={handleConfirm}
          isDisabled={isDeleting}
          isLoading={isDeleting}
        >
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeletePipelineRunModal;
