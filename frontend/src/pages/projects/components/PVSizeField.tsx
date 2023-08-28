import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, NumberInput } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { isHTMLInputElement } from '~/utilities/utils';

type PVSizeFieldProps = {
  fieldID: string;
  size: number;
  setSize: (size: number) => void;
  currentSize?: string;
};

const PVSizeField: React.FC<PVSizeFieldProps> = ({ fieldID, size, setSize, currentSize }) => {
  const minSize = parseInt(currentSize || '') || 1;

  const onStep = (step: number) => {
    setSize(Math.max(size + step, minSize));
  };
  return (
    <FormGroup
      label="Persistent storage size"
      helperText={
        currentSize
          ? 'Storage size can only be increased. If you do so, the workbench will restart and be unavailable for a period of time that is usually proportional to the size change.'
          : ''
      }
      helperTextIcon={<ExclamationTriangleIcon />}
      validated={currentSize ? 'warning' : 'default'}
      fieldId={fieldID}
    >
      <InputGroup>
        <NumberInput
          inputAriaLabel="Persistent storage size number input"
          id={fieldID}
          name={fieldID}
          value={size}
          min={minSize}
          onPlus={() => onStep(1)}
          onMinus={() => onStep(-1)}
          onChange={(event) => {
            if (isHTMLInputElement(event.target)) {
              const newSize = Number(event.target.value);
              setSize(isNaN(newSize) ? size : Math.max(newSize, minSize));
            }
          }}
        />
        <InputGroupText variant="plain">GiB</InputGroupText>
      </InputGroup>
    </FormGroup>
  );
};

export default PVSizeField;
