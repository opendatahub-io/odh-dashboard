import * as React from 'react';
import {
  FormGroup,
  InputGroup,
  InputGroupText,
  NumberInput,
  InputGroupItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { FormGroup } from '@patternfly/react-core';
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
  <FormGroup
    label="Persistent storage size"
    validated={currentSize ? 'warning' : 'default'}
    fieldId={fieldID}
  >
    <ValueUnitField
      min={1}
      onChange={(value) => setSize(value)}
      options={MEMORY_UNITS}
      value={size}
    />
    <FormHelperText>
      <HelperText>
        <HelperTextItem icon={currentSize && <ExclamationTriangleIcon />}>
          {currentSize &&
            'Storage size can only be increased. If you do so, the workbench will restart and be unavailable for a period of time that is usually proportional to the size change.'}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </FormGroup>
);

export default PVSizeField;
