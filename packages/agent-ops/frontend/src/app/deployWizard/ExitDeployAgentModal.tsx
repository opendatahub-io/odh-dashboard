import * as React from 'react';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';

type ExitDeployAgentModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

const ExitDeployAgentModal: React.FC<ExitDeployAgentModalProps> = ({ onClose, onConfirm }) => (
  <ContentModal
    title="Discard agent deployment configuration?"
    onClose={onClose}
    variant="small"
    dataTestId="exit-deploy-agent-modal"
    contents="Your configuration details for this agent deployment are not saved. Discard your changes and leave this page, or cancel to continue editing."
    buttonActions={[
      {
        label: 'Discard',
        onClick: onConfirm,
        variant: 'primary',
        dataTestId: 'exit-deploy-agent-discard-button',
      },
      {
        label: 'Cancel',
        onClick: onClose,
        variant: 'link',
        dataTestId: 'exit-deploy-agent-cancel-button',
      },
    ]}
  />
);

export default ExitDeployAgentModal;
