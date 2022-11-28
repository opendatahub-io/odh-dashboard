import * as React from 'react';
import { FormGroup, Select, SelectOption, Skeleton } from '@patternfly/react-core';
import useGPUSetting from './useGPUSetting';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

type GPUSelectFieldProps = {
  value: string;
  setValue: (newValue: string) => void;
};

const GPUSelectField: React.FC<GPUSelectFieldProps> = ({ value, setValue }) => {
  const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState(false);
  const { available, count: gpuSize, loaded, untrustedGPUs } = useGPUSetting();

  if (!available) {
    return null;
  }

  const gpuOptions = gpuSize === undefined ? [] : Array.from(Array(gpuSize + 1).keys());
  const noAvailableGPUs = gpuOptions.length === 1;

  let helpText: string | undefined;
  let helpTextIcon: React.ReactNode | undefined;
  if (noAvailableGPUs) {
    helpText = 'All GPUs are currently in use, try again later.';
  } else if (untrustedGPUs && value !== '0') {
    helpText = 'GPU availability is unverified';
    helpTextIcon = <ExclamationTriangleIcon />;
  }

  return (
    <FormGroup
      label="Number of GPUs"
      fieldId="modal-notebook-gpu-number"
      helperText={helpText}
      helperTextIcon={helpTextIcon}
      validated={untrustedGPUs && value !== '0' ? 'warning' : undefined}
    >
      {!loaded ? (
        <Skeleton height="36px" width="70%" />
      ) : (
        <Select
          removeFindDomNode
          data-id="gpu-select"
          isDisabled={!loaded || noAvailableGPUs}
          isOpen={gpuDropdownOpen}
          onToggle={() => setGpuDropdownOpen(!gpuDropdownOpen)}
          aria-labelledby="gpu-numbers"
          selections={value}
          onSelect={(event, selection) => {
            // We know we are setting values as a string
            if (typeof selection === 'string') {
              setGpuDropdownOpen(false);
              setValue(selection);
            }
          }}
          menuAppendTo="parent"
        >
          {gpuOptions.map((size) => (
            <SelectOption key={size} value={`${size}`} />
          ))}
        </Select>
      )}
    </FormGroup>
  );
};

export default GPUSelectField;
