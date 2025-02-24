import useDetectedAccelerators from './useDetectedAccelerators';

const useAcceleratorCountWarning = (newSize?: number | string, identifier?: string): string => {
  const [detectedAccelerators] = useDetectedAccelerators();

  if (!identifier) {
    return '';
  }

  const detectedAcceleratorCount = Object.entries(detectedAccelerators.available).find(
    ([id]) => identifier === id,
  )?.[1];

  if (detectedAcceleratorCount === undefined) {
    return `No accelerator detected with the identifier "${identifier}".`;
  }

  if (newSize !== undefined && Number(newSize) > detectedAcceleratorCount) {
    return `Only ${detectedAcceleratorCount} accelerator${
      detectedAcceleratorCount > 1 ? 's' : ''
    } detected.`;
  }

  return '';
};

export default useAcceleratorCountWarning;
