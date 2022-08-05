import * as React from 'react';
import { FormGroup, Select, SelectOption, Skeleton } from '@patternfly/react-core';
import { getGPU } from '../../../../services/gpuService';
import useNotification from '../../../../utilities/useNotification';

type GPUSelectFieldProps = {
  value: string;
  setValue: (newValue: string) => void;
};

const GPUSelectField: React.FC<GPUSelectFieldProps> = ({ value, setValue }) => {
  const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState<boolean>(false);
  const [gpuSize, setGpuSize] = React.useState<number>();
  const [isFetching, setFetching] = React.useState(true);
  const notification = useNotification();

  React.useEffect(() => {
    let lastCall = 0;
    let cancelled = false;
    const fetchGPU = () => {
      setFetching(true);
      lastCall = Date.now();
      return getGPU().then((size) => {
        if (cancelled) return;
        setGpuSize(size || 0);
        setFetching(false);
      });
    };

    const errorCatch = (e: Error) => {
      if (cancelled) return;
      setFetching(false);
      setGpuSize(0);
      console.error(e);
      notification.error('Failed to fetch GPU', e.message);
    };

    fetchGPU().catch(errorCatch);

    const onUserClick = (): void => {
      const now = Date.now();
      if (now - lastCall > 60_000) {
        // User has been idle for a while, let us check on GPUs again
        fetchGPU().catch(errorCatch);
      }
    };
    window.addEventListener('click', onUserClick);

    return () => {
      cancelled = true;
      window.removeEventListener('click', onUserClick);
    };
  }, [notification]);

  const gpuOptions = gpuSize === undefined ? [] : Array.from(Array(gpuSize + 1).keys());
  const noAvailableGPUs = gpuOptions.length === 1;

  return (
    <FormGroup
      label="Number of GPUs"
      fieldId="modal-notebook-gpu-number"
      helperText={noAvailableGPUs ? 'All GPUs are currently in use, try again later.' : undefined}
    >
      {isFetching ? (
        <Skeleton height="36px" width="70%" />
      ) : (
        <Select
          isDisabled={isFetching || noAvailableGPUs}
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
