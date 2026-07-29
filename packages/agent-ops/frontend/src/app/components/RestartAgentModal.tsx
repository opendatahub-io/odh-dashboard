import * as React from 'react';
import { Modal, ModalVariant, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';

type RestartAgentModalProps = {
  agentName: string;
  isRestarting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const RestartAgentModal: React.FC<RestartAgentModalProps> = ({
  agentName,
  isRestarting,
  onConfirm,
  onCancel,
}) => (
  <Modal variant={ModalVariant.small} isOpen onClose={onCancel}>
    <ModalHeader title="Restart agent deployment?" />
    <ModalBody>
      Are you sure you want to restart <strong>{agentName}</strong>? The agent pod will be
      recreated.
    </ModalBody>
    <ModalFooter>
      <DashboardModalFooter
        submitLabel="Restart"
        onSubmit={onConfirm}
        onCancel={onCancel}
        isSubmitLoading={isRestarting}
        isSubmitDisabled={isRestarting}
        isCancelDisabled={isRestarting}
      />
    </ModalFooter>
  </Modal>
);

export default RestartAgentModal;
