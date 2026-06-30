import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useModelServingEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;

export default useModelServingEnabled;
