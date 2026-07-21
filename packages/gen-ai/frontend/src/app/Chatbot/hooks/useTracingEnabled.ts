import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GEN_AI_TRACING } from '~/odh/extensions';

const useTracingEnabled = (): boolean => {
  const [tracingEnabled] = useFeatureFlag(GEN_AI_TRACING);
  return tracingEnabled;
};

export default useTracingEnabled;
