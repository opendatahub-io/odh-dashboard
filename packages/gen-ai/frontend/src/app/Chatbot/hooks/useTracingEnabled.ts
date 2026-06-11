import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { TRACING } from '~/odh/extensions';

const useTracingEnabled = (): boolean => {
  const [tracingEnabled] = useFeatureFlag(TRACING);
  return tracingEnabled;
};

export default useTracingEnabled;
