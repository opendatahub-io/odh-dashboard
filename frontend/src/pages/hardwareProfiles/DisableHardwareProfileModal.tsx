import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';

type DisableHardwareProfileModalProps = {
  onClose: (confirmStatus: boolean) => void;
};

const DisableHardwareProfileModal: React.FC<DisableHardwareProfileModalProps> = ({ onClose }) => (
  <Modal
    variant="small"
    title="Disable hardware profile"
    isOpen
    onClose={() => onClose(false)}
    actions={[
      <Button
        data-testid="disable-button"
        key="confirm-disable"
        variant="primary"
        onClick={() => onClose(true)}
      >
        Disable
      </Button>,
      <Button
        data-testid="cancel-button"
        key="cancel"
        variant="secondary"
        onClick={() => onClose(false)}
      >
        Cancel
      </Button>,
    ]}
  >
    This will disable the hardware profile and it will no longer be available for use with new
    workbenches and runtimes. Existing resources using this profile will retain it unless a new
    profile is selected.
  </Modal>
);

export default DisableHardwareProfileModal;
