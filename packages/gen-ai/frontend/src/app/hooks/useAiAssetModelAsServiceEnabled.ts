import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';

const useAiAssetModelAsServiceEnabled = (): boolean => {
  const [modelAsServiceEnabled] = useFeatureFlag('modelAsService');
  return modelAsServiceEnabled;
};

export default useAiAssetModelAsServiceEnabled;
