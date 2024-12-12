import React, { useEffect, useState } from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { Identifier } from '~/types';
import { EMPTY_IDENTIFIER } from './const';
import NodeResourceForm from './NodeResourceForm';

type ManageNodeResourceModalProps = {
  onClose: () => void;
  existingIdentifier?: Identifier;
  onSave: (identifier: Identifier) => void;
};

const ManageNodeResourceModal: React.FC<ManageNodeResourceModalProps> = ({
  onClose,
  existingIdentifier,
  onSave,
}) => {
  const [identifier, setIdentifier] = useState<Identifier>(EMPTY_IDENTIFIER);
  const isButtonDisabled =
    !identifier.displayName ||
    !identifier.identifier ||
    !identifier.defaultCount ||
    !identifier.minCount ||
    !identifier.maxCount;

  useEffect(() => {
    if (existingIdentifier) {
      setIdentifier(existingIdentifier);
    }
  }, [existingIdentifier]);

  const handleUpdate = (updatedIdentifier: Identifier) => {
    setIdentifier(updatedIdentifier);
  };

  const onBeforeClose = () => {
    setIdentifier(EMPTY_IDENTIFIER);
    onClose();
  };

  return (
    <Modal
      title={existingIdentifier ? 'Edit resource' : 'Add resource'}
      variant="medium"
      isOpen
      onClose={() => {
        onBeforeClose();
      }}
      footer={
        <DashboardModalFooter
          submitLabel={existingIdentifier ? 'Update' : 'Add'}
          onSubmit={() => {
            onSave(identifier);
            onBeforeClose();
          }}
          onCancel={() => onBeforeClose()}
          isSubmitDisabled={isButtonDisabled}
          alertTitle="Error saving resource"
        />
      }
    >
      <NodeResourceForm identifier={identifier} onUpdate={handleUpdate} />
    </Modal>
  );
};

export default ManageNodeResourceModal;
