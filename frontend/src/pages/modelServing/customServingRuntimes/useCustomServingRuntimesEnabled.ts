import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const useCustomServingRuntimesEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.CUSTOM_RUNTIMES).status;

export default useCustomServingRuntimesEnabled;
