import React from 'react';
import { Button, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';

interface ClusterStorageDetachModalProps {
  storageName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ClusterStorageDetachModal: React.FC<ClusterStorageDetachModalProps> = ({
  storageName,
  onConfirm,
  onClose,
}) => (
  <Modal isOpen variant="small" onClose={onClose}>
    <ModalHeader title="Detach storage?" />
    <ModalBody>
      The <b>{storageName}</b> storage and all of its resources will be detached from the workbench.
    </ModalBody>
    <ModalFooter>
      <Button key="confirm" variant="primary" onClick={onConfirm}>
        Detach
      </Button>
      <Button key="cancel" variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);
