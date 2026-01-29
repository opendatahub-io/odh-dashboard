import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';

const useGuardrailsEnabled = (): boolean => {
  const [guardrailsEnabled] = useFeatureFlag('guardrails');
  return guardrailsEnabled;
};

export default useGuardrailsEnabled;
