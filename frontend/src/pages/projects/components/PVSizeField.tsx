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
    <FormGroup label="Persistent storage size" fieldId={fieldID}>
      <InputGroup>
        <InputGroupItem>
          <NumberInput
            validated={currentSize ? 'warning' : 'default'}
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
                setSize(isNaN(newSize) ? size : newSize);
              }
            }}
            onBlur={(event) => {
              if (isHTMLInputElement(event.target)) {
                const blurSize = Number(event.target.value);
                setSize(Math.max(blurSize, minSize));
              }
            }}
          />
        </InputGroupItem>
        <InputGroupText>GiB</InputGroupText>
      </InputGroup>
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
};

export default PVSizeField;
