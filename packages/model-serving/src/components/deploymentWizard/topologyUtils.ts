/**
 * Topology-aware visibility helpers for the deployment wizard.
 *
 * Cannot import TopologyType enum or isTopologyTypeFieldData from @odh-dashboard/llmd-serving
 * because llmd-serving depends on model-serving — importing the other way would be circular.
 * These string constants mirror TopologyType.SINGLE_NODE from llmd-serving/types.
 * Tech debt ticket- https://redhat.atlassian.net/browse/RHOAIENG-73746
 */

const TOPOLOGY_TYPE_FIELD_KEY = 'llmd-serving/topology-type';
const SINGLE_NODE_TOPOLOGY = 'workload-single-node';

const isTopologyFieldData = (data: unknown): data is { topologyType: string } =>
  data != null &&
  typeof data === 'object' &&
  'topologyType' in data &&
  typeof data.topologyType === 'string';

export const isNonSingleNodeTopologyActive = (state: Record<string, unknown>): boolean => {
  const topologyData: unknown = state[TOPOLOGY_TYPE_FIELD_KEY];
  if (isTopologyFieldData(topologyData)) {
    return topologyData.topologyType !== SINGLE_NODE_TOPOLOGY;
  }
  return false;
};
