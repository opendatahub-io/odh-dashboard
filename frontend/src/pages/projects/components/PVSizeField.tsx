import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, NumberInput } from '@patternfly/react-core';
import { isHTMLInputElement, normalizeBetween } from '../../../utilities/utils';

type PVSizeFieldProps = {
  fieldID: string;
  availableSize: number;
  size: number;
  setSize: (size: number) => void;
};

const PVSizeField: React.FC<PVSizeFieldProps> = ({ fieldID, availableSize, size, setSize }) => {
  const MIN_SIZE = 0.1; // We can decide this value later and move it out to const file

  const onStep = (step: number) => {
    setSize(normalizeBetween(size + step, MIN_SIZE, availableSize));
  };
  return (
    <FormGroup
      label="PV size"
      fieldId={fieldID}
      helperText={`${availableSize} of 20 GiB available`}
    >
      <InputGroup>
        <NumberInput
          id={fieldID}
          name={fieldID}
          value={size}
          max={availableSize}
          min={MIN_SIZE}
          onPlus={() => onStep(1)}
          onMinus={() => onStep(-1)}
          onChange={(event) => {
            if (isHTMLInputElement(event.target)) {
              const newSize = Number(event.target.value);
              setSize(
                isNaN(newSize) ? availableSize : normalizeBetween(newSize, MIN_SIZE, availableSize),
              );
            }
          }}
        />
        <InputGroupText variant="plain">GiB</InputGroupText>
      </InputGroup>
    </FormGroup>
  );
};

export default PVSizeField;
