import { RunStatus } from '@patternfly/react-topology';

type InferUniqueFailedNodeOptions = {
  nodeIds: string[];
  statusById: Map<string, RunStatus | undefined>;
  dependenciesById: Map<string, string[]>;
  shouldInfer: boolean;
  isCandidate?: (nodeId: string) => boolean;
  isUnresolved?: (nodeId: string, status: RunStatus | undefined) => boolean;
  isContradictoryStatus?: (status: RunStatus | undefined) => boolean;
  isTransparent?: (nodeId: string) => boolean;
  onInferredNode?: (nodeId: string) => void;
};

const isCompleted = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Succeeded || status === RunStatus.Skipped;

/** Marks one unambiguous reachable node failed and its unresolved descendants pending. */
export const inferUniqueFailedNode = ({
  nodeIds,
  statusById,
  dependenciesById,
  shouldInfer,
  isCandidate = () => true,
  isUnresolved = (_nodeId, status) => status == null,
  isContradictoryStatus = (status) => status === RunStatus.InProgress,
  isTransparent = () => false,
  onInferredNode,
}: InferUniqueFailedNodeOptions): Map<string, RunStatus | undefined> => {
  if (!shouldInfer) {
    return statusById;
  }

  const nodeById = new Set(nodeIds);
  const dependenciesSucceeded = (nodeId: string, visiting = new Set<string>()): boolean => {
    if (visiting.has(nodeId) || !nodeById.has(nodeId)) {
      return false;
    }
    visiting.add(nodeId);

    if (isTransparent(nodeId)) {
      const dependencies = dependenciesById.get(nodeId) ?? [];
      return (
        dependencies.length > 0 &&
        dependencies.every((dependency) => dependenciesSucceeded(dependency, new Set(visiting)))
      );
    }

    return isCompleted(statusById.get(nodeId));
  };

  const reachableUnresolvedNodes = nodeIds.filter(
    (nodeId) =>
      isCandidate(nodeId) &&
      isUnresolved(nodeId, statusById.get(nodeId)) &&
      (dependenciesById.get(nodeId) ?? []).every((dependency) => dependenciesSucceeded(dependency)),
  );

  if (reachableUnresolvedNodes.length !== 1) {
    return statusById;
  }

  const inferredNodeId = reachableUnresolvedNodes[0];
  const dependentsById = new Map<string, string[]>(nodeIds.map((nodeId) => [nodeId, []]));
  for (const nodeId of nodeIds) {
    for (const dependency of dependenciesById.get(nodeId) ?? []) {
      dependentsById.get(dependency)?.push(nodeId);
    }
  }

  const hasContradictoryDescendant = (nodeId: string, visited = new Set<string>()): boolean => {
    if (visited.has(nodeId)) {
      return false;
    }
    visited.add(nodeId);
    return (dependentsById.get(nodeId) ?? []).some(
      (dependent) =>
        isContradictoryStatus(statusById.get(dependent)) ||
        hasContradictoryDescendant(dependent, new Set(visited)),
    );
  };

  if (hasContradictoryDescendant(inferredNodeId)) {
    return statusById;
  }

  onInferredNode?.(inferredNodeId);

  const pendingDescendants = new Set<string>();
  const queue = [inferredNodeId];
  while (queue.length > 0) {
    const failedNodeId = queue.shift();
    if (failedNodeId == null) {
      continue;
    }
    for (const dependent of dependentsById.get(failedNodeId) ?? []) {
      if (!pendingDescendants.has(dependent)) {
        pendingDescendants.add(dependent);
        queue.push(dependent);
      }
    }
  }

  const nextStatusById = new Map(statusById);
  nextStatusById.set(inferredNodeId, RunStatus.Failed);
  for (const descendant of pendingDescendants) {
    if (isUnresolved(descendant, statusById.get(descendant))) {
      nextStatusById.set(descendant, RunStatus.Pending);
    }
  }
  return nextStatusById;
};
