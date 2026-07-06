import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { EXTERNAL_VECTOR_STORES } from '~/odh/extensions';

const useAiAssetVectorStoresEnabled = (): boolean => {
  const [aiAssetVectorStoresEnabled] = useFeatureFlag(EXTERNAL_VECTOR_STORES);
  return aiAssetVectorStoresEnabled;
};

export default useAiAssetVectorStoresEnabled;
