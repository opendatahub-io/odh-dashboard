import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';

const useAiAssetExternalModelsEnabled = (): boolean => {
  const [aiAssetExternalModelsEnabled] = useFeatureFlag('ai-asset-external-models');
  return aiAssetExternalModelsEnabled;
};

export default useAiAssetExternalModelsEnabled;
