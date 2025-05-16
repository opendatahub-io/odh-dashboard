import * as React from 'react';
import { Button, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';

type DisableAcceleratorProfileModalType = {
  onClose: (confirmStatus: boolean) => void;
};

const DisableAcceleratorProfileModal: React.FC<DisableAcceleratorProfileModalType> = ({
  onClose,
}) => (
  <Modal variant="small" isOpen onClose={() => onClose(false)}>
    <ModalHeader title="Disable accelerator profile" />
    <ModalBody>
      This will disable the accelerator profile and it will no longer be available for use with new
      workbenches and runtimes. Existing resources using this profile will retain it unless a new
      profile is selected.
    </ModalBody>
    <ModalFooter>
      <Button
        data-testid="disable-button"
        key="confirm-disable"
        variant="primary"
        onClick={() => onClose(true)}
      >
        Disable
      </Button>
      <Button
        data-testid="cancel-button"
        key="cancel"
        variant="secondary"
        onClick={() => onClose(false)}
      >
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default DisableAcceleratorProfileModal;
