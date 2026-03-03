import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import React from 'react';

type EnterYAMLEditModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export const EnterYAMLEditModal: React.FC<EnterYAMLEditModalProps> = ({ onClose, onConfirm }) => {
  return (
    <ContentModal
      onClose={onClose}
      title="Switch to manual YAML editor?"
      contents="By entering manual edit mode, you will be able to modify the YAML directly. However, you will no longer be able to use the guided form, and any manual changes will be lost."
      titleIconVariant="warning"
      variant="small"
      buttonActions={[
        {
          label: 'Switch to manual YAML editor',
          onClick: onConfirm,
          variant: 'danger',
          dataTestId: 'switch-to-manual-yaml-editor',
        },
        {
          label: 'Cancel',
          onClick: onClose,
          variant: 'link',
          dataTestId: 'cancel-switch-to-manual-yaml-editor',
        },
      ]}
    />
  );
};
