import { DEFAULT_SPACER_NODE_TYPE, NodeShape, type EdgeModel } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { parseBranchIndexFromSuffix } from '~/app/topology/stageMapConstants';
import {
  type BranchExpandOptions,
  isBranchingStageNodeId,
  matchesWinnerModel,
  resolveVisibleBranchIndices,
} from './branchExpand';
import type { TreeNodeModel, TreeTopologyData } from './types';
import { TREE_EDGE_TYPE, TREE_NODE_TYPE } from './treeFactories';
import type { TreeNodeData } from './TreeNode';
import { isBranchStepNodeId } from './stageMapStepMetadata';
import { runStatusToTreeStepState, treeStepStateToNodeStatus } from './treeStepState';

/** Circle diameter for PatternFly DefaultNode custom nodes (dense pipeline layout). */
const STANDARD_NODE_SIZE = 48;
/** Branch steps match status-badge scale (design: smaller than stage nodes). */
const BRANCH_STEP_NODE_SIZE = 28;
const X_START = 40;
const X_GAP = 120;
const Y_CENTER = 200;
const Y_PIPELINE_GAP = 110;

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
  dataExtras?: Partial<TreeNodeData>,
): TreeNodeModel => {
  const stepState = runStatusToTreeStepState(topologyNode.data?.runStatus);
  const label = dataExtras?.label ?? topologyNode.label;
  const isBranchStep = isBranchStepNodeId(topologyNode.id);
  const nodeSize = isBranchStep ? BRANCH_STEP_NODE_SIZE : STANDARD_NODE_SIZE;
  // Keep node centers aligned with standard-sized neighbors on the spine.
  const originOffset = (STANDARD_NODE_SIZE - nodeSize) / 2;
  return {
    id: topologyNode.id,
    type: TREE_NODE_TYPE,
    label,
    x: x + originOffset,
    y: y + originOffset,
    width: nodeSize,
    height: nodeSize,
    // Circle + NodeStatus for stroke color. Labels are custom (showLabel=false) so
    // PF status does not draw green label boxes.
    shape: NodeShape.circle,
    status: treeStepStateToNodeStatus(stepState),
    data: {
      label,
      stepState,
      activeIconVariant: topologyNode.data?.activeIconVariant,
      ...dataExtras,
    },
  };
};

const modelTerminusExtras = (
  topologyNode: PipelineNodeModelExpanded,
  options: BranchExpandOptions | undefined,
  isCollapsedSpine: boolean,
): Partial<TreeNodeData> | undefined => {
  if (!options || !topologyNode.id.includes('__model__')) {
    return undefined;
  }

  const isWinner = matchesWinnerModel(topologyNode, options);

  // Succeeded + matched winner branch: model name + "Winner" subtitle + star.
  if (options.winnerResolved && isWinner) {
    return {
      label: options.winnerModelLabel ?? topologyNode.label,
      labelSubtitle: 'Winner',
      showWinnerStar: true,
    };
  }

  // Collapsed spine without a winner match: generic label + winner badge, no star.
  if (isCollapsedSpine) {
    return {
      label: 'Model',
      labelSubtitle: 'Winner',
      showWinnerStar: false,
    };
  }

  return undefined;
};

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
  options?: BranchExpandOptions,
): TreeTopologyData => {
  const nodes: TreeNodeModel[] = [];
  const edges: EdgeModel[] = [];

  const { linearPre, branches, branchIndices, postBranch } =
    parseStageMapTopologyNodes(topologyNodes);
  const expandOptions: BranchExpandOptions = options ?? {
    modelsExpanded: true,
    winnerResolved: false,
  };
  const visibleBranchIndices = resolveVisibleBranchIndices(branchIndices, branches, expandOptions);
  const isCollapsedSpine = !expandOptions.modelsExpanded && branchIndices.length > 1;

  let currentX: number = X_START;
  const linearPreIds: string[] = [];

  linearPre.forEach((topologyNode, index) => {
    linearPreIds.push(topologyNode.id);
    nodes.push(
      createTreeNode(
        topologyNode,
        currentX,
        Y_CENTER,
        isBranchingStageNodeId(topologyNode.id) ? { showModelsToggle: true } : undefined,
      ),
    );
    currentX += X_GAP;
    if (index > 0) {
      edges.push(createEdge(`e-linear-${index}`, linearPreIds[index - 1], topologyNode.id));
    }
  });

  const branchSourceId = linearPreIds[linearPreIds.length - 1];
  const branchTailIds: string[] = [];
  const pipelineStartX = currentX + X_GAP * 0.2;
  const displayYPositions = calculatePipelineYPositions(visibleBranchIndices.length);

  visibleBranchIndices.forEach((branchIndex, positionIndex) => {
    const branchNodes = branches.get(branchIndex) ?? [];
    const pipelineY = displayYPositions[positionIndex] ?? Y_CENTER;
    let stepX = pipelineStartX;
    const branchNodeIds: string[] = [];

    branchNodes.forEach((topologyNode, stepIndex) => {
      nodes.push(
        createTreeNode(
          topologyNode,
          stepX,
          pipelineY,
          modelTerminusExtras(topologyNode, expandOptions, isCollapsedSpine),
        ),
      );
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
