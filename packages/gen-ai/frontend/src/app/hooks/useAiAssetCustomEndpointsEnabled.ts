import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';

const useAiAssetCustomEndpointsEnabled = (): boolean => {
  const [aiAssetCustomEndpointsEnabled] = useFeatureFlag('aiAssetCustomEndpoints');
  return aiAssetCustomEndpointsEnabled;
};

export default useAiAssetCustomEndpointsEnabled;
