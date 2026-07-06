import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { MODEL_AS_SERVICE_CAMEL } from '~/odh/extensions';

const useAiAssetModelAsServiceEnabled = (): boolean => {
  const [modelAsServiceEnabled] = useFeatureFlag(MODEL_AS_SERVICE_CAMEL);
  return modelAsServiceEnabled;
};

export default useAiAssetModelAsServiceEnabled;
