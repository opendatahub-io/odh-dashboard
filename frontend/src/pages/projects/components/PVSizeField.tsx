import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, NumberInput } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { isHTMLInputElement, normalizeBetween } from '../../../utilities/utils';
import useDefaultPvcSize from '../screens/spawner/storage/useAvailablePvcSize';

type PVSizeFieldProps = {
  fieldID: string;
  size: number;
  setSize: (size: number) => void;
  disable?: boolean;
};

const PVSizeField: React.FC<PVSizeFieldProps> = ({ fieldID, size, setSize, disable }) => {
  const MIN_SIZE = 1;
  const defaultSize = useDefaultPvcSize();
  const availableSize = defaultSize * 2;

  const onStep = (step: number) => {
    setSize(normalizeBetween(size + step, MIN_SIZE, availableSize));
  };
  return (
    <FormGroup
      label="Persistent storage size"
      helperText={disable ? 'Size cannot be changed after creation.' : ''}
      helperTextIcon={<ExclamationTriangleIcon />}
      validated={disable ? 'warning' : 'default'}
      fieldId={fieldID}
    >
      <InputGroup>
        <NumberInput
          id={fieldID}
          isDisabled={disable}
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
