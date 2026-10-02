import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GEN_AI_AGENT_DEPLOYMENT } from '~/odh/extensions';
import useFetchBFFConfig from './useFetchBFFConfig';

type AgentDeploymentAvailability = {
  enabled: boolean;
  loaded: boolean;
};

const useGenAiAgentDeploymentEnabled = (): AgentDeploymentAvailability => {
  const [genAiAgentDeploymentEnabled] = useFeatureFlag(GEN_AI_AGENT_DEPLOYMENT);
  const { data: bffConfig, loaded } = useFetchBFFConfig();

  return {
    enabled: genAiAgentDeploymentEnabled && bffConfig?.sandboxesAvailable === true,
    loaded,
  };
};

export default useGenAiAgentDeploymentEnabled;
