import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GEN_AI_AGENT_DEPLOYMENT } from '~/odh/extensions';
import useFetchBFFConfig from './useFetchBFFConfig';

const useGenAiAgentDeploymentEnabled = (): boolean => {
  const [genAiAgentDeploymentEnabled] = useFeatureFlag(GEN_AI_AGENT_DEPLOYMENT);
  const { data: bffConfig } = useFetchBFFConfig();
  return genAiAgentDeploymentEnabled && bffConfig?.sandboxesAvailable === true;
};

export default useGenAiAgentDeploymentEnabled;
