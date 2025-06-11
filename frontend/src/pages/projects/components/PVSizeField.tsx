import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import ValueUnitField from '#~/components/ValueUnitField';
import { MEMORY_UNITS_FOR_SELECTION, UnitOption } from '#~/utilities/valueUnits';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import {
  ConnectedNotebookContext,
  useRelatedNotebooks,
} from '#~/pages/projects/notebook/useRelatedNotebooks';

type PVSizeFieldProps = {
  fieldID: string;
  size: string;
  menuAppendTo?: HTMLElement;
  setSize: (size: string) => void;
  currentStatus?: PersistentVolumeClaimKind['status'];
  label?: string;
  options?: UnitOption[];
  existingPvcName?: string;
};

const PVSizeField: React.FC<PVSizeFieldProps> = ({
  fieldID,
  size,
  menuAppendTo,
  setSize,
  currentStatus,
  label = 'Persistent storage size',
  options = MEMORY_UNITS_FOR_SELECTION,
  existingPvcName,
}) => {
  const currentSize = currentStatus?.capacity?.storage;
  const isUnbound = currentStatus && currentStatus.phase !== 'Bound';

  const { notebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    existingPvcName,
  );

  const hasExistingNotebookConnections = notebooks.length > 0;

  return (
    <FormGroup label={label} fieldId={fieldID} data-testid={fieldID}>
      <ValueUnitField
        min={currentSize ?? 1}
        onBlur={(value) => setSize(value)}
        menuAppendTo={menuAppendTo}
        onChange={(value) => setSize(value)}
        validated={currentSize ? 'warning' : 'default'}
        options={options}
        value={size}
        isDisabled={isUnbound}
      />

      {(currentSize || isUnbound) && (
        <FormHelperText>
          <HelperText>
            {isUnbound && (
              <HelperTextItem
                data-testid="persistent-storage-warning-can-not-edit"
                variant="warning"
                icon={<ExclamationTriangleIcon />}
              >
                To edit the size, you must first attach this cluster storage to a workbench, then
                start the workbench. If the workbench is already running, it will restart
                automatically.
              </HelperTextItem>
            )}
            {currentSize && (
              <HelperTextItem
                data-testid="persistent-storage-warning-can-only-increase"
                variant="warning"
                icon={<ExclamationTriangleIcon />}
              >
                {!hasExistingNotebookConnections
                  ? 'Storage size can only be increased. To complete the storage size update, you must connect to and run a workbench.'
                  : 'Storage size can only be increased. If you do so, the workbench will restart and be unavailable for a period of time that is usually proportional to the size change.'}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default PVSizeField;
