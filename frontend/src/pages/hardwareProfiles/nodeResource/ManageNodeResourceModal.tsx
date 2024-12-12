import React from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { Identifier } from '~/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { CPU_UNITS, MEMORY_UNITS_FOR_SELECTION, UnitOption } from '~/utilities/valueUnits';
import { EMPTY_IDENTIFIER } from './const';
import NodeResourceForm from './NodeResourceForm';
import { validateDefaultCount, validateMinCount } from './utils';

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

  const isUniqueIdentifier = React.useMemo(() => {
    if (existingIdentifier) {
      return true;
    }
    return !nodeResources.some((i) => i.identifier === identifier.identifier);
  }, [existingIdentifier, identifier.identifier, nodeResources]);

  React.useEffect(() => {
    switch (identifier.identifier) {
      case 'cpu':
        setUnitOptions(CPU_UNITS);
        break;
      case 'memory':
        setUnitOptions(MEMORY_UNITS_FOR_SELECTION);
        break;
      default:
        setUnitOptions(undefined);
    }
  }, [identifier]);

  const isButtonDisabled = React.useMemo(() => {
    const isValidCounts = unitOptions
      ? validateDefaultCount(identifier, unitOptions) && validateMinCount(identifier, unitOptions)
      : true;

    return (
      !identifier.displayName || !identifier.identifier || !isUniqueIdentifier || !isValidCounts
    );
  }, [identifier, unitOptions, isUniqueIdentifier]);

  const handleSubmit = () => {
    onSave(identifier);
    onClose();
  };

  return (
    <Modal
      title={existingIdentifier ? 'Edit resource' : 'Add resource'}
      variant="medium"
      isOpen
      onClose={onClose}
      footer={
        <DashboardModalFooter
          submitLabel={existingIdentifier ? 'Update' : 'Add'}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitDisabled={isButtonDisabled}
        />
      }
    >
      <NodeResourceForm
        identifier={identifier}
        setIdentifier={setIdentifier}
        unitOptions={unitOptions}
        existingIdentifier={!!existingIdentifier}
        isUniqueIdentifier={isUniqueIdentifier}
      />
    </Modal>
  );
};

export default ManageNodeResourceModal;
