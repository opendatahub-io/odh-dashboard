import * as React from 'react';
import { Button, Modal } from '@patternfly/react-core';

type DisableAcceleratorProfileModal = {
  isOpen: boolean;
  onClose: (confirmStatus: boolean) => void;
};

const DisableAcceleratorProfileModal: React.FC<DisableAcceleratorProfileModal> = ({
  isOpen,
  onClose,
}) => (
  <Modal
    variant="small"
    title="Disable accelerator"
    isOpen={isOpen}
    onClose={() => onClose(false)}
    actions={[
      <Button key="confirm-disable" variant="primary" onClick={() => onClose(true)}>
        Disable
      </Button>,
      <Button key="cancel" variant="secondary" onClick={() => onClose(false)}>
        Cancel
      </Button>,
    ]}
  >
    Disable this will disable accelerators for existing images and runtimes that want to use it.
  </Modal>
);

export default DisableAcceleratorProfileModal;
