import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type ExitDeploymentModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export const ExitDeploymentModal: React.FC<ExitDeploymentModalProps> = ({ onClose, onConfirm }) => {
  return (
    <Modal isOpen onClose={onClose} variant="small">
      <ModalHeader
        title="Discard deployment configuration?"
        titleIconVariant="warning"
        labelId="exit-deployment-modal-title"
      />
      <ModalBody>
        <span id="exit-deployment-modal-description">
          Your configuration details for this model deployment are not saved. Discard your changes
          and leave this page, or cancel to continue editing.
        </span>
      </ModalBody>
      <ModalFooter>
        <Button key="discard" variant="primary" onClick={onConfirm}>
          Discard
        </Button>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
