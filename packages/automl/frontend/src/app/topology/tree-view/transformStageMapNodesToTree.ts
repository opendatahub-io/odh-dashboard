import { DEFAULT_SPACER_NODE_TYPE, type EdgeModel } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { parseBranchIndexFromSuffix } from '~/app/topology/stageMapConstants';
import type { TreeNodeModel, TreeTopologyData } from './types';
import { TREE_EDGE_TYPE, TREE_NODE_TYPE } from './treeFactories';
import { runStatusToTreeStepState } from './treeStepState';

const STANDARD_NODE_SIZE = 9;
const X_START = 40;
const X_GAP = 95;
const Y_CENTER = 200;
const Y_PIPELINE_GAP = 90;

const BRANCH_STEP_SUFFIX_ID = /^.+__step__.+__branch-\d+$/;
const BRANCH_STEP_PREFIX_ID = /^.+__branch-\d+__step__.+$/;
const BRANCH_MODEL_ID = /^.+__model__branch-\d+$/;

const isBranchNode = (nodeId: string): boolean =>
  BRANCH_STEP_SUFFIX_ID.test(nodeId) ||
  BRANCH_STEP_PREFIX_ID.test(nodeId) ||
  BRANCH_MODEL_ID.test(nodeId);

const getBranchIndex = (nodeId: string): number | undefined => {
  const modelMatch = /__model__branch-(\d+)$/.exec(nodeId);
  if (modelMatch?.[1]) {
    return parseBranchIndexFromSuffix(`branch-${modelMatch[1]}`);
  }

  const stepSuffixBranchMatch = /__step__.+__branch-(\d+)$/.exec(nodeId);
  if (stepSuffixBranchMatch?.[1]) {
    return parseBranchIndexFromSuffix(`branch-${stepSuffixBranchMatch[1]}`);
  }

  const stepPrefixBranchMatch = /__branch-(\d+)__step__/.exec(nodeId);
  if (stepPrefixBranchMatch?.[1]) {
    return parseBranchIndexFromSuffix(`branch-${stepPrefixBranchMatch[1]}`);
  }

  const branchMatch = /(?:^|__)branch-(\d+)(?:__|$)/.exec(nodeId);
  return branchMatch?.[1] ? parseBranchIndexFromSuffix(`branch-${branchMatch[1]}`) : undefined;
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
  let supportBranchLayout = true;

  for (const node of taskNodes) {
    if (isBranchNode(node.id)) {
      if (phase === 'post') {
        // A second branch phase after post-branch linear nodes is unsupported for fan-out layout.
        supportBranchLayout = false;
      }
      phase = 'branch';

      if (supportBranchLayout) {
        const branchIdx = getBranchIndex(node.id);
        if (branchIdx === undefined) {
          postBranch.push(node);
        } else {
          const branchNodes = branches.get(branchIdx) ?? [];
          branchNodes.push(node);
          branches.set(branchIdx, branchNodes);
        }
      } else {
        postBranch.push(node);
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

  let currentX = X_START;
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
