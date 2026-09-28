import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { GEN_AI_MCP_REGISTRY_SERVERS } from '~/odh/extensions';

const useGenAiMcpRegistryServers = (): boolean => {
  const [enabled] = useFeatureFlag(GEN_AI_MCP_REGISTRY_SERVERS);
  return enabled;
};

export default useGenAiMcpRegistryServers;
