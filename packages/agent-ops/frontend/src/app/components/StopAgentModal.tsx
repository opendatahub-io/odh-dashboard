import * as React from 'react';
import { Modal, ModalVariant, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';

type StopAgentModalProps = {
  agentName: string;
  isStopping: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const StopAgentModal: React.FC<StopAgentModalProps> = ({
  agentName,
  isStopping,
  onConfirm,
  onCancel,
}) => (
  <Modal variant={ModalVariant.small} isOpen onClose={onCancel}>
    <ModalHeader title="Stop agent deployment?" />
    <ModalBody>
      Are you sure you want to stop <strong>{agentName}</strong>? The agent will stop serving
      requests until it is started again.
    </ModalBody>
    <ModalFooter>
      <DashboardModalFooter
        submitLabel="Stop"
        onSubmit={onConfirm}
        onCancel={onCancel}
        isSubmitLoading={isStopping}
        isSubmitDisabled={isStopping}
        isCancelDisabled={isStopping}
      />
    </ModalFooter>
  </Modal>
);

export default StopAgentModal;
