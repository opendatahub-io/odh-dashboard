import React from 'react';
import { Modal, ModalVariant, Button } from '@patternfly/react-core';

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
  <Modal
    isOpen
    variant={ModalVariant.small}
    title="Detach storage?"
    onClose={onClose}
    actions={[
      <Button key="confirm" variant="primary" onClick={onConfirm}>
        Detach
      </Button>,
      <Button key="cancel" variant="link" onClick={onClose}>
        Cancel
      </Button>,
    ]}
  >
    The <b>{storageName}</b> storage and all of its resources will be detached from the workbench.
  </Modal>
);
