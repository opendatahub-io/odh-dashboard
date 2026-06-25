import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useCustomServingRuntimesEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.CUSTOM_RUNTIMES).status;

export default useCustomServingRuntimesEnabled;
