import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GEN_AI_AUDIO_UPLOAD } from '~/odh/extensions';

const useGenAiAudioUploadEnabled = (): boolean => {
  const [audioUploadEnabled] = useFeatureFlag(GEN_AI_AUDIO_UPLOAD);
  return audioUploadEnabled;
};

export default useGenAiAudioUploadEnabled;
