import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GEN_AI_IMAGE_UPLOAD } from '~/odh/extensions';

const useGenAiImageUploadEnabled = (): boolean => {
  const [imageUploadEnabled] = useFeatureFlag(GEN_AI_IMAGE_UPLOAD);
  return imageUploadEnabled;
};

export default useGenAiImageUploadEnabled;
