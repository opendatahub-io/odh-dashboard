import * as React from 'react'; //import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@patternfly/react-core';

type RoleBindingPermissionsChangeModalProps = {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  roleName?: string;
};

const RoleBindingPermissionsChangeModal: React.FC<RoleBindingPermissionsChangeModalProps> = ({
  onClose,
  onEdit,
  onDelete,
  onCancel,
  isDeleting,
  roleName,
}) => {
  const textToShow = isDeleting ? 'Delete' : 'Edit';
  return (
    <Modal
      variant="small"
      aria-label="Role binding permissions change modal"
      data-testid="role-binding-permissions-change-modal"
      appendTo={document.body}
      isOpen
      onClose={onClose}
    >
      <ModalHeader title={`Confirm ${textToShow.toLowerCase()}`} />
      <ModalBody>
        Are you sure you want to {isDeleting ? 'delete' : 'edit'} permissions for{' '}
        <strong>{roleName || 'this role binding'}</strong>? {isDeleting ? 'Deleting' : 'Editing'}{' '}
        these permissions may result in loss of access to this resource.
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          key="confirm"
          onClick={isDeleting ? onDelete : onEdit}
          data-testid="confirm-button"
        >
          {isDeleting ? 'Delete' : 'Save'}
        </Button>
        <Button
          variant="secondary"
          key="cancel"
          onClick={() => {
            onCancel();
            onClose();
          }}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RoleBindingPermissionsChangeModal;
