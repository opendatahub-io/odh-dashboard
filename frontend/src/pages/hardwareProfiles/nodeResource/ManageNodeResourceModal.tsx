import React from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { Identifier, IdentifierResourceType } from '~/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { CPU_UNITS, MEMORY_UNITS_FOR_SELECTION, UnitOption } from '~/utilities/valueUnits';
import { useValidation } from '~/utilities/useValidation';
import { EMPTY_IDENTIFIER } from './const';
import NodeResourceForm from './NodeResourceForm';
import { validateDefaultCount, validateMinCount } from './utils';
import {
  getResourceIdentifierErrorMessage,
  getResourceLabelErrorMessage,
  isResourceIdentifierValid,
  isResourceLabelValid,
  NodeResourceModalFormData,
  resourceLabelIdentifierSchema,
} from './validationUtils';

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

  const [data, setData] = useGenericObjectState<NodeResourceModalFormData>({
    resourceLabel: identifier.displayName,
    resourceIdentifier: identifier.displayName,
  });

  const validation = useValidation(data, resourceLabelIdentifierSchema);

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

  const isValidCounts =
    validateDefaultCount(identifier, unitOptions) && validateMinCount(identifier, unitOptions);

  const isButtonDisabled =
    isResourceLabelValid(validation) ||
    isResourceIdentifierValid(validation) ||
    !isUniqueIdentifier ||
    !isValidCounts;

  const handleSubmit = () => {
    onSave(identifier);
    onClose();
  };

  return (
    <Modal
      title={existingIdentifier ? 'Edit node resource' : 'Add node resource'}
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
        setData={setData}
        unitOptions={unitOptions}
        isUniqueIdentifier={isUniqueIdentifier}
        resourceLabelErrorMessage={getResourceLabelErrorMessage(validation)}
        resourceIdentifierErrorMessage={getResourceIdentifierErrorMessage(validation)}
      />
    </Modal>
  );
};

export default ManageNodeResourceModal;
