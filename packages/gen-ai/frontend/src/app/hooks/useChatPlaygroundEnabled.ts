import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { CHAT_PLAYGROUND } from '~/odh/extensions';

const useChatPlaygroundEnabled = (): boolean => {
  const [chatPlaygroundEnabled] = useFeatureFlag(CHAT_PLAYGROUND);
  return chatPlaygroundEnabled;
};

export default useChatPlaygroundEnabled;
