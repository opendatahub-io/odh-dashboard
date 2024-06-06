import React from 'react';
import { Modal } from '@patternfly/react-core';
import { ModelRegistryKind } from '~/k8sTypes';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';

type ManagePermissionsModalProps = {
  modelRegistry: ModelRegistryKind;
  isOpen: boolean;
  onClose: () => void;
  refresh: () => Promise<unknown>;
};

const ManagePermissionsModal: React.FC<ManagePermissionsModalProps> = ({
  modelRegistry: mr,
  isOpen,
  onClose,
  refresh,
}) => (
  <Modal
    title={`Manage permissions of ${mr.metadata.name}`}
    description="Manage users and projects that can access this model registry."
    isOpen={isOpen}
    onClose={onClose}
    variant="medium"
    footer={
      <DashboardModalFooter
        submitLabel="Save"
        onSubmit={() => {
          // TODO submit changes, then...
          refresh();
        }}
        onCancel={onClose}
        isSubmitDisabled // TODO
        error={undefined} // TODO
        alertTitle="Error saving permissions"
      />
    }
  >
    TODO: This feature is not yet implemented
  </Modal>
);

export default ManagePermissionsModal;
