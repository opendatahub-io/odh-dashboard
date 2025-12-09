import React from 'react';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';

type ExitDeploymentModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export const ExitDeploymentModal: React.FC<ExitDeploymentModalProps> = ({ onClose, onConfirm }) => (
  <ContentModal
    title="Discard deployment configuration?"
    onClose={onClose}
    variant="small"
    dataTestId="exit-deployment-modal"
    contents="Your configuration details for this model deployment are not saved. Discard your changes and leave this page, or cancel to continue editing."
    buttonActions={[
      {
        label: 'Discard',
        onClick: onConfirm,
        variant: 'primary',
        dataTestId: 'exit-deployment-discard-button',
      },
      {
        label: 'Cancel',
        onClick: onClose,
        variant: 'link',
        dataTestId: 'exit-deployment-cancel-button',
        clickOnEnter: true,
      },
    ]}
  />
);
