import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useModelRegistryEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.MODEL_REGISTRY).status;

export default useModelRegistryEnabled;
