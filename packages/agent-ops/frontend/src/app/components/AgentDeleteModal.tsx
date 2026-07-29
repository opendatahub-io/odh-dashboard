import * as React from 'react';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';

type AgentDeleteModalProps = {
  agentName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const AgentDeleteModal: React.FC<AgentDeleteModalProps> = ({
  agentName,
  isDeleting,
  onConfirm,
  onCancel,
}) => (
  <DeleteModal
    title="Delete agent deployment?"
    onClose={onCancel}
    onDelete={onConfirm}
    deleteName={agentName}
    deleting={isDeleting}
    removeConfirmation
    testId="agent-delete-modal"
  >
    Are you sure you want to delete <strong>{agentName}</strong>? This action cannot be undone.
  </DeleteModal>
);

export default AgentDeleteModal;
