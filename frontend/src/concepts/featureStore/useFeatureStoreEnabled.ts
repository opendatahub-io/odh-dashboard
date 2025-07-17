import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const useFeatureStoreEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.FEATURE_STORE).status;

export default useFeatureStoreEnabled;
