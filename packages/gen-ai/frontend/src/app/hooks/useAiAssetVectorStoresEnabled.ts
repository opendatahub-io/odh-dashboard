import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';

const useAiAssetVectorStoresEnabled = (): boolean => {
  const [aiAssetVectorStoresEnabled] = useFeatureFlag('ai-asset-vector-stores');
  return aiAssetVectorStoresEnabled;
};

export default useAiAssetVectorStoresEnabled;
