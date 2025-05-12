import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';

type RoleBindingPermissionsChangeModalProps = {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting: boolean;
};

const RoleBindingPermissionsChangeModal: React.FC<RoleBindingPermissionsChangeModalProps> = ({
  onClose,
  onEdit,
  onDelete,
  onCancel,
  isDeleting,
}) => {
  const textToShow = isDeleting ? 'Delete' : 'Edit';
  const modalActions = [
    <Button key="confirm" variant="primary" onClick={isDeleting ? onDelete : onEdit}>
      {isDeleting ? 'Delete' : 'Save'}
    </Button>,
    <Button
      data-testid="cancel-button"
      key="cancel"
      variant="secondary"
      onClick={() => {
        onCancel();
        onClose();
      }}
    >
      Cancel
    </Button>,
  ];
  return (
    <Modal
      aria-label="Role binding permissions change modal"
      data-testid="role-binding-permissions-change-modal"
      appendTo={document.body}
      variant={ModalVariant.small}
      title={`Confirm ${textToShow.toLowerCase()}`}
      isOpen
      showClose
      onClose={onClose}
      actions={modalActions}
    >
      Are you sure you want to {isDeleting ? 'delete' : 'edit'} this role binding?{' '}
      {isDeleting ? 'Deleting' : 'Editing'} your permissions could result in loss of access to the
      project.
    </Modal>
  );
};

export default RoleBindingPermissionsChangeModal;
