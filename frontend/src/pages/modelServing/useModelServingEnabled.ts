import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const useModelServingEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;

export default useModelServingEnabled;
