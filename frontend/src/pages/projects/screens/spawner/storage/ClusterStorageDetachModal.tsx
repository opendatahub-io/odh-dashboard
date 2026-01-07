import React from 'react';
import ContentModal, { ButtonAction } from '#~/components/modals/ContentModal.tsx';

interface ClusterStorageDetachModalProps {
  storageName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ClusterStorageDetachModal: React.FC<ClusterStorageDetachModalProps> = ({
  storageName,
  onConfirm,
  onClose,
}) => {
  const buttonActions: ButtonAction[] = [
    {
      label: 'Detach',
      onClick: onConfirm,
      variant: 'primary',
      dataTestId: 'detach-storage-modal-button',
    },
    {
      label: 'Cancel',
      onClick: onClose,
      variant: 'link',
      dataTestId: 'cancel-storage-modal-button',
    },
  ];

  const contents = (
    <div>
      The <b>{storageName}</b> storage and all of its resources will be detached from the workbench.
    </div>
  );
  return (
    <ContentModal
      onClose={onClose}
      title="Detach storage?"
      contents={contents}
      buttonActions={buttonActions}
      dataTestId="detach-storage-modal"
      variant="small"
    />
  );
};
