import { TopologyEdgeModel } from './types';

export const findConnectedElements = (nodeId: string, edges: TopologyEdgeModel[]): string[] => {
  if (!nodeId) return [];

  const upstreamMap = new Map<string, TopologyEdgeModel[]>();
  const downstreamMap = new Map<string, TopologyEdgeModel[]>();

  const filteredEdges = edges.filter((e) => !e.data?.isPositioningEdge);
  filteredEdges.forEach((edge) => {
    // Downstream map: source -> targets
    if (!downstreamMap.has(edge.source)) {
      downstreamMap.set(edge.source, []);
    }
    downstreamMap.get(edge.source)?.push(edge);

    // Upstream map: target -> sources
    if (!upstreamMap.has(edge.target)) {
      upstreamMap.set(edge.target, []);
    }
    upstreamMap.get(edge.target)?.push(edge);
  });

  const result = new Set<string>();

  const traverseDownstream = (currentNodeId: string, visited: Set<string>) => {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);
    result.add(currentNodeId);

    const outgoingEdges = downstreamMap.get(currentNodeId) || [];
    outgoingEdges.forEach((edge) => {
      result.add(edge.id);
      traverseDownstream(edge.target, visited);
    });
  };

  const traverseUpstream = (currentNodeId: string, visited: Set<string>) => {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);
    result.add(currentNodeId);

    const incomingEdges = upstreamMap.get(currentNodeId) || [];
    incomingEdges.forEach((edge) => {
      result.add(edge.id);
      traverseUpstream(edge.source, visited);
    });
  };

  // Start with the selected node
  result.add(nodeId);

  // Traverse upstream and downstream with direction-specific visited sets
  traverseUpstream(nodeId, new Set<string>());
  traverseDownstream(nodeId, new Set<string>());

  return [...result];
};
