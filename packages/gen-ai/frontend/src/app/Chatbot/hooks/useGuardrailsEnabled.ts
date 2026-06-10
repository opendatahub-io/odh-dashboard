import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GUARDRAILS } from '~/odh/extensions';

const useGuardrailsEnabled = (): boolean => {
  const [guardrailsEnabled] = useFeatureFlag(GUARDRAILS);
  return guardrailsEnabled;
};

export default useGuardrailsEnabled;
