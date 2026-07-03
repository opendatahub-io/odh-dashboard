const TOPOLOGY_TYPE_FIELD_KEY = 'llmd-serving/topology-type';
const SINGLE_NODE_TOPOLOGY = 'workload-single-node';

const getTopologyType = (state: Record<string, unknown>): string | undefined => {
  const topologyData: unknown = state[TOPOLOGY_TYPE_FIELD_KEY];
  if (topologyData != null && typeof topologyData === 'object' && 'topologyType' in topologyData) {
    const record = topologyData as Record<string, unknown>; // eslint-disable-line @typescript-eslint/consistent-type-assertions
    return typeof record.topologyType === 'string' ? record.topologyType : undefined;
  }
  return undefined;
};

export const isNonSingleNodeTopologyActive = (state: Record<string, unknown>): boolean => {
  const topologyType = getTopologyType(state);
  return topologyType != null && topologyType !== SINGLE_NODE_TOPOLOGY;
};
