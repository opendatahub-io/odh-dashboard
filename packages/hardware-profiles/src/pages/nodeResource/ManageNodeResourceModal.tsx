import React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import { type Identifier, IdentifierResourceType } from '@odh-dashboard/k8s-core';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import useGenericObjectState from '@odh-dashboard/internal/utilities/useGenericObjectState';
import {
  CPU_UNITS,
  MEMORY_UNITS_FOR_SELECTION,
  UnitOption,
} from '@odh-dashboard/internal/utilities/valueUnits';
import { useValidation } from '@odh-dashboard/internal/utilities/useValidation';
import { EMPTY_IDENTIFIER } from './const';
import NodeResourceForm from './NodeResourceForm';
import { identifierSchema } from '../manage/validationUtils';

type ManageNodeResourceModalProps = {
  onClose: () => void;
  existingIdentifier?: Identifier;
  onSave: (identifier: Identifier) => void;
  nodeResources: Identifier[];
};

const ManageNodeResourceModal: React.FC<ManageNodeResourceModalProps> = ({
  onClose,
  existingIdentifier,
  onSave,
  nodeResources,
}) => {
  const [identifier, setIdentifier] = useGenericObjectState<Identifier>(
    existingIdentifier || EMPTY_IDENTIFIER,
  );

  const [unitOptions, setUnitOptions] = React.useState<UnitOption[]>();

  const isUniqueIdentifier =
    identifier.identifier === existingIdentifier?.identifier ||
    !nodeResources.some((i) => i.identifier === identifier.identifier);

  React.useEffect(() => {
    switch (identifier.resourceType) {
      case IdentifierResourceType.CPU:
        setUnitOptions(CPU_UNITS);
        break;
      case IdentifierResourceType.MEMORY:
        setUnitOptions(MEMORY_UNITS_FOR_SELECTION);
        break;
      default:
        setUnitOptions(undefined);
    }
  }, [identifier]);

  const isModalValidated = useValidation(identifier, identifierSchema);

  const isButtonDisabled = !isUniqueIdentifier || !isModalValidated.validationResult.success;

  const handleSubmit = () => {
    onSave(identifier);
    onClose();
  };

  return (
    <Modal variant="medium" isOpen onClose={onClose}>
      <ModalHeader title={existingIdentifier ? 'Edit node resource' : 'Add node resource'} />
      <ModalBody>
        <NodeResourceForm
          identifier={identifier}
          setIdentifier={setIdentifier}
          unitOptions={unitOptions}
          isUniqueIdentifier={isUniqueIdentifier}
        />
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={existingIdentifier ? 'Update' : 'Add'}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitDisabled={isButtonDisabled}
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageNodeResourceModal;
