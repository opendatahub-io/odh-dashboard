import { DEFAULT_SPACER_NODE_TYPE, type EdgeModel } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { parseBranchIndexFromSuffix } from '~/app/topology/stageMapConstants';
import type { TreeNodeModel, TreeTopologyData } from './types';
import { TREE_EDGE_TYPE, TREE_NODE_TYPE } from './treeFactories';
import { runStatusToTreeStepState } from './treeStepState';

/** Fixed SVG coordinates for the pipeline tree (NoopLayout skips auto-layout). */
const STANDARD_NODE_SIZE = 9;
const X_START = 40;
const X_GAP = 95;
const Y_CENTER = 200;
const Y_PIPELINE_GAP = 90;

/** Safe digit-only branch token check (no overlapping quantifiers). */
const isBranchToken = (value: string): boolean => /^branch-\d+$/.test(value);

/**
 * Deterministic parse of accepted branch node-ID formats:
 * - `{component}__step__{stepId}__branch-{N}`
 * - `{component}__branch-{N}__step__{stepId}`
 * - `{component}__model__branch-{N}`
 */
const parseBranchNode = (nodeId: string): { branchToken: string } | undefined => {
  const parts = nodeId.split('__');

  // component__step__stepId__branch-N
  if (
    parts.length === 4 &&
    parts[0] &&
    parts[1] === 'step' &&
    parts[2] &&
    isBranchToken(parts[3])
  ) {
    return { branchToken: parts[3] };
  }

  // component__branch-N__step__stepId
  if (
    parts.length === 4 &&
    parts[0] &&
    isBranchToken(parts[1]) &&
    parts[2] === 'step' &&
    parts[3]
  ) {
    return { branchToken: parts[1] };
  }

  // component__model__branch-N
  if (parts.length === 3 && parts[0] && parts[1] === 'model' && isBranchToken(parts[2])) {
    return { branchToken: parts[2] };
  }

  return undefined;
};

const isBranchNode = (nodeId: string): boolean => parseBranchNode(nodeId) !== undefined;

const getBranchIndex = (nodeId: string): number | undefined => {
  const parsed = parseBranchNode(nodeId);
  return parsed ? parseBranchIndexFromSuffix(parsed.branchToken) : undefined;
};

export type ParsedStageMapTopology = {
  linearPre: PipelineNodeModelExpanded[];
  branches: Map<number, PipelineNodeModelExpanded[]>;
  branchIndices: number[];
  postBranch: PipelineNodeModelExpanded[];
};

/** Splits buildStageMapTopology nodes into linear pre-branch, parallel branches, and post-branch. */
export const parseStageMapTopologyNodes = (
  topologyNodes: PipelineNodeModelExpanded[],
): ParsedStageMapTopology => {
  const taskNodes = topologyNodes.filter((node) => node.type !== DEFAULT_SPACER_NODE_TYPE);
  const linearPre: PipelineNodeModelExpanded[] = [];
  const branches = new Map<number, PipelineNodeModelExpanded[]>();
  const postBranch: PipelineNodeModelExpanded[] = [];
  let phase: 'pre' | 'branch' | 'post' = 'pre';

  for (const node of taskNodes) {
    if (isBranchNode(node.id)) {
      if (phase === 'post') {
        // A second branch phase after post-branch linear nodes cannot be laid out as a fan-out
        // (or honestly as post-branch linear). Reject so callers can fall back.
        throw new Error(
          'Unsupported stage-map topology: a second branch phase after post-branch linear nodes is not supported',
        );
      }
      phase = 'branch';

      const branchIdx = getBranchIndex(node.id);
      if (branchIdx === undefined) {
        postBranch.push(node);
      } else {
        const branchNodes = branches.get(branchIdx) ?? [];
        branchNodes.push(node);
        branches.set(branchIdx, branchNodes);
      }
      continue;
    }

    if (phase === 'branch') {
      phase = 'post';
    }

    if (phase === 'pre') {
      linearPre.push(node);
    } else {
      postBranch.push(node);
    }
  }

  const branchIndices = [...branches.keys()].toSorted((a, b) => a - b);
  return { linearPre, branches, branchIndices, postBranch };
};

const calculatePipelineYPositions = (modelCount: number): number[] => {
  if (modelCount === 0) {
    return [];
  }
  if (modelCount === 1) {
    return [Y_CENTER];
  }

  const totalHeight = (modelCount - 1) * Y_PIPELINE_GAP;
  const startY = Y_CENTER - totalHeight / 2;
  return Array.from({ length: modelCount }, (_, i) => startY + i * Y_PIPELINE_GAP);
};

const createTreeNode = (
  topologyNode: PipelineNodeModelExpanded,
  x: number,
  y: number,
): TreeNodeModel => ({
  id: topologyNode.id,
  type: TREE_NODE_TYPE,
  label: topologyNode.label,
  x,
  y,
  width: STANDARD_NODE_SIZE,
  height: STANDARD_NODE_SIZE,
  data: {
    label: topologyNode.label,
    stepState: runStatusToTreeStepState(topologyNode.data?.runStatus),
    activeIconVariant: topologyNode.data?.activeIconVariant,
  },
});

const createEdge = (id: string, source: string, target: string): EdgeModel => ({
  id,
  type: TREE_EDGE_TYPE,
  source,
  target,
});

/**
 * Lays out nodes from buildStageMapTopology in the tree visualization format.
 */
export const transformStageMapNodesToTree = (
  topologyNodes: PipelineNodeModelExpanded[],
): TreeTopologyData => {
  const nodes: TreeNodeModel[] = [];
  const edges: EdgeModel[] = [];

  const { linearPre, branches, branchIndices, postBranch } =
    parseStageMapTopologyNodes(topologyNodes);

  let currentX: number = X_START;
  const linearPreIds: string[] = [];

  linearPre.forEach((topologyNode, index) => {
    linearPreIds.push(topologyNode.id);
    nodes.push(createTreeNode(topologyNode, currentX, Y_CENTER));
    currentX += X_GAP;
    if (index > 0) {
      edges.push(createEdge(`e-linear-${index}`, linearPreIds[index - 1], topologyNode.id));
    }
  });

  const branchSourceId = linearPreIds[linearPreIds.length - 1];
  const branchTailIds: string[] = [];
  const pipelineStartX = currentX + X_GAP * 0.2;
  const displayYPositions = calculatePipelineYPositions(branchIndices.length);

  branchIndices.forEach((branchIndex, positionIndex) => {
    const branchNodes = branches.get(branchIndex) ?? [];
    const pipelineY = displayYPositions[positionIndex] ?? Y_CENTER;
    let stepX = pipelineStartX;
    const branchNodeIds: string[] = [];

    branchNodes.forEach((topologyNode, stepIndex) => {
      nodes.push(createTreeNode(topologyNode, stepX, pipelineY));
      branchNodeIds.push(topologyNode.id);
      stepX += X_GAP;
      if (stepIndex > 0) {
        edges.push(
          createEdge(
            `e-branch-${branchIndex}-${stepIndex}`,
            branchNodeIds[stepIndex - 1],
            topologyNode.id,
          ),
        );
      }
    });

    if (branchSourceId && branchNodeIds[0]) {
      edges.push(createEdge(`e-pre-to-branch-${branchIndex}`, branchSourceId, branchNodeIds[0]));
    }

    const tailId = branchNodeIds[branchNodeIds.length - 1];
    if (tailId) {
      branchTailIds.push(tailId);
    }

    if (stepX > currentX) {
      currentX = stepX;
    }
  });

  // When every branch index is invalid (nodes fall into postBranch), connect from the pre-branch
  // tail so the converge edge logic below still runs.
  if (branchTailIds.length === 0 && branchSourceId) {
    branchTailIds.push(branchSourceId);
  }

  currentX += X_GAP * 0.5;
  const postBranchIds: string[] = [];

  postBranch.forEach((topologyNode, index) => {
    postBranchIds.push(topologyNode.id);
    nodes.push(createTreeNode(topologyNode, currentX, Y_CENTER));
    currentX += X_GAP;
    if (index > 0) {
      edges.push(createEdge(`e-post-${index}`, postBranchIds[index - 1], topologyNode.id));
    }
  });

  if (postBranchIds[0]) {
    branchTailIds.forEach((tailId, index) => {
      edges.push(createEdge(`e-converge-${index}`, tailId, postBranchIds[0]));
    });
  }

  return { nodes, edges };
};
