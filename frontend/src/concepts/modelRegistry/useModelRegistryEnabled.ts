import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const useModelRegistryEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.MODEL_REGISTRY).status;

export default useModelRegistryEnabled;
