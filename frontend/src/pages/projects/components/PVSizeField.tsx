import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import ValueUnitField from '~/components/ValueUnitField';
import { MEMORY_UNITS } from '~/utilities/valueUnits';

type PVSizeFieldProps = {
  fieldID: string;
  size: string;
  setSize: (size: string) => void;
  currentSize?: string;
};

const PVSizeField: React.FC<PVSizeFieldProps> = ({ fieldID, size, setSize, currentSize }) => (
  <FormGroup label="Persistent storage size" fieldId={fieldID}>
    <ValueUnitField
      min={currentSize ?? 1}
      onBlur={(value) => setSize(value)}
      onChange={(value) => setSize(value)}
      validated={currentSize ? 'warning' : 'default'}
      options={MEMORY_UNITS}
      value={size}
    />
    {currentSize && (
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant="warning" icon={<ExclamationTriangleIcon />}>
            Storage size can only be increased. If you do so, the workbench will restart and be
            unavailable for a period of time that is usually proportional to the size change.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    )}
  </FormGroup>
);

export default PVSizeField;
