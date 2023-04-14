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
          ? "Increase the capacity of storage data. Note that capacity can't be less than the current storage size. This can be a time-consuming process."
          : ''
      }
      helperTextIcon={<ExclamationTriangleIcon />}
      validated={currentSize ? 'warning' : 'default'}
      fieldId={fieldID}
    >
      <InputGroup>
        <NumberInput
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
