import { usePluginStore } from '@openshift/dynamic-plugin-sdk';

const useGuardrailsEnabled = (): boolean => usePluginStore().getFeatureFlags().guardrails === true;

export default useGuardrailsEnabled;
