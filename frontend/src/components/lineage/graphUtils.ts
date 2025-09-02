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

  const connectedIds: string[] = [];
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();

  const traverseDownstream = (currentNodeId: string) => {
    if (visitedNodes.has(currentNodeId)) return;

    visitedNodes.add(currentNodeId);
    connectedIds.push(currentNodeId);

    const outgoingEdges = downstreamMap.get(currentNodeId) || [];
    outgoingEdges.forEach((edge) => {
      if (!visitedEdges.has(edge.id)) {
        visitedEdges.add(edge.id);
        connectedIds.push(edge.id);
        traverseDownstream(edge.target);
      }
    });
  };

  const traverseUpstream = (currentNodeId: string) => {
    if (visitedNodes.has(currentNodeId)) return;

    visitedNodes.add(currentNodeId);
    connectedIds.push(currentNodeId);

    const incomingEdges = upstreamMap.get(currentNodeId) || [];
    incomingEdges.forEach((edge) => {
      if (!visitedEdges.has(edge.id)) {
        visitedEdges.add(edge.id);
        connectedIds.push(edge.id);
        traverseUpstream(edge.source);
      }
    });
  };

  // Start with the selected node
  visitedNodes.add(nodeId);
  connectedIds.push(nodeId);

  // Traverse upstream and downstream
  const upstreamEdges = upstreamMap.get(nodeId) || [];
  upstreamEdges.forEach((edge) => {
    if (!visitedEdges.has(edge.id)) {
      visitedEdges.add(edge.id);
      connectedIds.push(edge.id);
      traverseUpstream(edge.source);
    }
  });

  const downstreamEdges = downstreamMap.get(nodeId) || [];
  downstreamEdges.forEach((edge) => {
    if (!visitedEdges.has(edge.id)) {
      visitedEdges.add(edge.id);
      connectedIds.push(edge.id);
      traverseDownstream(edge.target);
    }
  });

  return connectedIds;
};
