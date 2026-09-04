import { QUOTA_UNASSIGNED_NODE_ID } from '../const';
import { QUOTA_NODE_TYPE, QuotaSelection, QuotaTreeNode } from '../types';

export const findQuotaTreeNode = (
  nodes: QuotaTreeNode[],
  nodeId: string,
): QuotaTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const match = findQuotaTreeNode(node.children, nodeId);
    if (match) {
      return match;
    }
  }
  return undefined;
};

export const getQuotaNodePath = (
  nodes: QuotaTreeNode[],
  nodeId: string,
  path: string[] = [],
): string[] | undefined => {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    if (node.id === nodeId) {
      return nextPath;
    }
    const childPath = getQuotaNodePath(node.children, nodeId, nextPath);
    if (childPath) {
      return childPath;
    }
  }
  return undefined;
};

export const selectionFromPath = (
  nodes: QuotaTreeNode[],
  path: string[],
): QuotaSelection | undefined => {
  if (path.length === 0) {
    return undefined;
  }

  const findNode = (
    currentNodes: QuotaTreeNode[],
    segmentIndex: number,
  ): QuotaTreeNode | undefined => {
    const segment = path[segmentIndex];
    for (const node of currentNodes) {
      if (node.name !== segment) {
        continue;
      }
      if (segmentIndex === path.length - 1) {
        return node;
      }
      const childMatch = findNode(node.children, segmentIndex + 1);
      if (childMatch) {
        return childMatch;
      }
    }
    return undefined;
  };

  const node = findNode(nodes, 0);
  if (!node) {
    return undefined;
  }
  return selectionFromNode(node, path);
};

export const getAncestorNodeIds = (
  nodes: QuotaTreeNode[],
  nodeId: string,
  ancestors: string[] = [],
): string[] | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return ancestors;
    }
    const match = getAncestorNodeIds(node.children, nodeId, [...ancestors, node.id]);
    if (match) {
      return match;
    }
  }
  return undefined;
};

export const selectionFromNode = (
  node: QuotaTreeNode,
  path: string[],
): QuotaSelection | undefined => {
  if (!node.selectable) {
    return undefined;
  }
  switch (node.type) {
    case QUOTA_NODE_TYPE.unassigned:
      return { type: QUOTA_NODE_TYPE.unassigned, path };
    case QUOTA_NODE_TYPE.cohort:
      if (!node.cohortName) {
        return undefined;
      }
      return { type: QUOTA_NODE_TYPE.cohort, cohortName: node.cohortName, path };
    case QUOTA_NODE_TYPE.clusterQueue:
      if (!node.clusterQueue) {
        return undefined;
      }
      return {
        type: QUOTA_NODE_TYPE.clusterQueue,
        clusterQueueName: node.name,
        path,
        clusterQueue: node.clusterQueue,
      };
    default:
      return undefined;
  }
};

const visitPreorder = (nodes: QuotaTreeNode[], visit: (node: QuotaTreeNode) => void): void => {
  for (const node of nodes) {
    visit(node);
    visitPreorder(node.children, visit);
  }
};

/** Default: Unassigned bucket when present, else first cohort node. */
export const getDefaultQuotaSelection = (tree: QuotaTreeNode[]): QuotaSelection | undefined => {
  const unassigned = tree.find((node) => node.type === QUOTA_NODE_TYPE.unassigned);
  if (unassigned) {
    const path = getQuotaNodePath(tree, unassigned.id);
    return path ? selectionFromNode(unassigned, path) : undefined;
  }

  let firstCohort: QuotaTreeNode | undefined;
  visitPreorder(tree, (node) => {
    if (!firstCohort && node.type === QUOTA_NODE_TYPE.cohort) {
      firstCohort = node;
    }
  });

  if (!firstCohort) {
    return undefined;
  }

  const path = getQuotaNodePath(tree, firstCohort.id);
  return path ? selectionFromNode(firstCohort, path) : undefined;
};

/** Keeps the current selection when possible, but re-derives it from the latest tree data. */
export const syncQuotaSelectionWithTree = (
  tree: QuotaTreeNode[],
  current?: QuotaSelection,
): QuotaSelection | undefined => {
  if (!current) {
    return getDefaultQuotaSelection(tree);
  }

  const nodeId = nodeIdFromSelection(current);
  const node = findQuotaTreeNode(tree, nodeId);
  if (!node) {
    return getDefaultQuotaSelection(tree);
  }

  const path = getQuotaNodePath(tree, nodeId);
  if (!path) {
    return getDefaultQuotaSelection(tree);
  }

  return selectionFromNode(node, path) ?? getDefaultQuotaSelection(tree);
};

export const filterQuotaTreeByName = (nodes: QuotaTreeNode[], search: string): QuotaTreeNode[] => {
  const query = search.trim().toLowerCase();
  if (!query) {
    return nodes;
  }

  const filterNode = (node: QuotaTreeNode): QuotaTreeNode | undefined => {
    const isNodeNameMatch = node.name.toLowerCase().includes(query);

    if (node.type === QUOTA_NODE_TYPE.unassigned) {
      if (isNodeNameMatch) {
        return { ...node, children: node.children };
      }
      const children = node.children
        .map(filterNode)
        .filter((child): child is QuotaTreeNode => child !== undefined);
      return children.length > 0 ? { ...node, children } : undefined;
    }

    if (isNodeNameMatch) {
      return { ...node, children: node.children };
    }

    const filteredChildren = node.children
      .map(filterNode)
      .filter((child): child is QuotaTreeNode => child !== undefined);

    if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return undefined;
  };

  return nodes.map(filterNode).filter((node): node is QuotaTreeNode => node !== undefined);
};

/** Ancestor node ids that must be expanded to reveal the current selection. */
export const getExpandedIdsForSelection = (
  tree: QuotaTreeNode[],
  selection?: QuotaSelection,
): Set<string> => {
  if (!selection) {
    return new Set();
  }
  const ancestors = getAncestorNodeIds(tree, nodeIdFromSelection(selection));
  return new Set(ancestors ?? []);
};

/** All nodes with children — used for expand-all. */
export const collectAllExpandableNodeIds = (nodes: QuotaTreeNode[]): Set<string> => {
  const expanded = new Set<string>();
  const visit = (node: QuotaTreeNode): void => {
    if (node.children.length > 0) {
      expanded.add(node.id);
    }
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return expanded;
};

export const collectExpandedNodeIds = (nodes: QuotaTreeNode[], search: string): Set<string> => {
  const expanded = new Set<string>();
  const query = search.trim().toLowerCase();
  if (!query) {
    return expanded;
  }

  const visit = (node: QuotaTreeNode): boolean => {
    const childMatches = node.children.map(visit);
    const selfMatches =
      node.type !== QUOTA_NODE_TYPE.unassigned && node.name.toLowerCase().includes(query);
    const hasMatchingDescendant = childMatches.some(Boolean);

    if (hasMatchingDescendant) {
      expanded.add(node.id);
    }
    return selfMatches || hasMatchingDescendant;
  };

  nodes.forEach(visit);
  return expanded;
};

export const nodeIdFromSelection = (selection: QuotaSelection): string => {
  if (selection.type === QUOTA_NODE_TYPE.unassigned) {
    return QUOTA_UNASSIGNED_NODE_ID;
  }
  return selection.type === QUOTA_NODE_TYPE.cohort
    ? `cohort-${selection.cohortName}`
    : `cq-${selection.clusterQueueName}`;
};
