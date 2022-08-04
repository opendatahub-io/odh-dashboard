import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { getGPU } from '../../../../services/gpuService';

type GPUSelectFieldProps = {
  value: string;
  setValue: (newValue: string) => void;
};

const GPUSelectField: React.FC<GPUSelectFieldProps> = ({ value, setValue }) => {
  const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState<boolean>(false);
  const [gpuSize, setGpuSize] = React.useState<number>(0);

  React.useEffect(() => {
    let cancelled = false;
    const setGpu = async () => {
      const size = await getGPU();
      if (!cancelled) {
        setGpuSize(size);
      }
    };
    setGpu().catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, []);

  const gpuOptions = Array.from(Array(gpuSize + 1).keys());
  const noAvailableGPUs = gpuOptions.length === 1;

  return (
    <FormGroup
      label="Number of GPUs"
      fieldId="modal-notebook-gpu-number"
      helperText={noAvailableGPUs ? 'All GPUs are currently in use, try again later.' : undefined}
    >
      <Select
        isDisabled={noAvailableGPUs}
        isOpen={gpuDropdownOpen}
        onToggle={() => setGpuDropdownOpen(!gpuDropdownOpen)}
        aria-labelledby="gpu-numbers"
        selections={value}
        onSelect={(event, selection) => {
          // Bug in Patternfly typing... this should always be a string
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
    </FormGroup>
  );
};

export default GPUSelectField;
