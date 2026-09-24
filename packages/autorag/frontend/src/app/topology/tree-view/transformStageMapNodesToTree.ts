import { DEFAULT_SPACER_NODE_TYPE, NodeShape, type EdgeModel } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { parseBranchIndexFromSuffix } from '~/app/topology/stageMapConstants';
import { getPatternRowLabel } from '~/app/topology/stageMapLabels';
import {
  type BranchExpandOptions,
  matchesWinnerPattern,
  resolvePatternRank,
  resolveVisibleBranchIndices,
} from './branchExpand';
import type { TreeNodeModel, TreeTopologyData } from './types';
import { TREE_EDGE_TYPE, TREE_NODE_TYPE } from './treeFactories';
import { ROW_LABEL_GAP, ROW_LABEL_WIDTH } from './treeEdgePath';
import type { TreeNodeData } from './TreeNode';
import { isBranchStepNodeId, parseStageMapNodeId } from './stageMapStepMetadata';
import {
  runStatusToTreeStepState,
  treeStepStateToNodeStatus,
  type TreeStepState,
} from './treeStepState';

/** Circle diameter for PatternFly DefaultNode custom nodes (dense pipeline layout). */
const STANDARD_NODE_SIZE = 40;
/** Branch corridor dots — half the stage-node diameter (collapsed spine design). */
const BRANCH_STEP_NODE_SIZE = 20;
/** Row-label box stays tall enough for "Pattern N" while the dots shrink. */
const ROW_LABEL_HEIGHT = 32;
const X_START = 40;
const X_GAP = 120;
const Y_CENTER = 200;
const Y_PIPELINE_GAP = 110;
const COLUMN_HEADER_Y_OFFSET = 72;
/** Horizontal run for fan-out curves before the pattern row-label column. */
const FAN_OUT_RUN = 140;
const COLUMN_RULE_HEIGHT = 2;
const TOGGLE_Y_OFFSET = 60;
/** Extra drop on the collapsed spine so the toggle clears task captions. */
const COLLAPSED_TOGGLE_Y_OFFSET = 120;
const PATTERN_RESULT_HEADER = 'Pattern result';
const PATTERNS_TOGGLE_NODE_ID = 'autorag-patterns-toggle';

/** Safe digit-only branch token check (no overlapping quantifiers). */
const isBranchToken = (value: string): boolean => /^branch-\d+$/.test(value);

/**
 * Deterministic parse of accepted branch node-ID formats:
 * - `{component}__step__{stepId}__branch-{N}`
 * - `{component}__branch-{N}__step__{stepId}`
 * - `{component}__pattern__branch-{N}`
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

  // component__pattern__branch-N
  if (parts.length === 3 && parts[0] && parts[1] === 'pattern' && isBranchToken(parts[2])) {
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

const nextStepState = (
  topologyNode: PipelineNodeModelExpanded,
  predecessorFailed: boolean,
): TreeStepState => {
  const stepState = runStatusToTreeStepState(topologyNode.data?.runStatus);
  if (predecessorFailed && (stepState === 'pending' || stepState === 'unreached')) {
    return 'unreached';
  }
  return stepState;
};

const createTreeNode = (
  topologyNode: PipelineNodeModelExpanded,
  x: number,
  y: number,
  stepState: TreeStepState,
  dataExtras?: Partial<TreeNodeData>,
): TreeNodeModel => {
  const isBranchStep = isBranchStepNodeId(topologyNode.id);
  const nodeSize = isBranchStep ? BRANCH_STEP_NODE_SIZE : STANDARD_NODE_SIZE;
  // Keep node centers aligned with standard-sized neighbors on the spine.
  const originOffset = (STANDARD_NODE_SIZE - nodeSize) / 2;
  const data: TreeNodeData = {
    stepState,
    activeIconVariant: topologyNode.data?.activeIconVariant,
    ...dataExtras,
  };
  if (dataExtras?.hideLabel) {
    data.label = undefined;
  } else if (data.label === undefined) {
    data.label = topologyNode.label;
  }
  return {
    id: topologyNode.id,
    type: TREE_NODE_TYPE,
    label: data.label ?? '',
    x: x + originOffset,
    y: y + originOffset,
    width: nodeSize,
    height: nodeSize,
    // Circle + NodeStatus for stroke color. Labels are custom (showLabel=false) so
    // PF status does not draw green label boxes.
    shape: NodeShape.circle,
    status: treeStepStateToNodeStatus(stepState),
    data,
  };
};

const createAnnotationNode = (
  id: string,
  x: number,
  y: number,
  data: TreeNodeData,
): TreeNodeModel => ({
  id,
  type: TREE_NODE_TYPE,
  label: data.label ?? '',
  x,
  y,
  width: STANDARD_NODE_SIZE,
  height: STANDARD_NODE_SIZE,
  shape:
    data.nodeRole === 'column-rule' || data.nodeRole === 'column-header'
      ? NodeShape.rect
      : NodeShape.circle,
  status: treeStepStateToNodeStatus(data.stepState),
  data,
});

const patternTerminusExtras = (
  topologyNode: PipelineNodeModelExpanded,
  options: BranchExpandOptions | undefined,
  isCollapsedSpine: boolean,
  hideLabel: boolean,
): Partial<TreeNodeData> => {
  const extras: Partial<TreeNodeData> = {};
  if (hideLabel) {
    extras.hideLabel = true;
  }
  if (!options || !topologyNode.id.includes('__pattern__')) {
    return extras;
  }

  const winnerRank = resolvePatternRank(topologyNode, options.patternRanks);
  if (winnerRank) {
    extras.winnerRank = winnerRank;
    extras.showWinnerStar = winnerRank === 1;
  }

  const isWinner = matchesWinnerPattern(topologyNode, options);
  let collapsedRowLabel: string | undefined;
  if (isCollapsedSpine) {
    const collapsedBranchIndex = getBranchIndex(topologyNode.id);
    collapsedRowLabel =
      collapsedBranchIndex === undefined ? 'Pattern' : getPatternRowLabel(collapsedBranchIndex);
  }

  // Collapsed spine: "Pattern N" over "winner" — do not use the API display name here.
  if (collapsedRowLabel !== undefined) {
    if (options.winnerResolved && isWinner) {
      return {
        ...extras,
        label: collapsedRowLabel,
        labelSubtitle: 'winner',
        showWinnerStar: true,
        winnerRank: extras.winnerRank ?? 1,
      };
    }
    return {
      ...extras,
      winnerRank: undefined,
      label: collapsedRowLabel,
      labelSubtitle: 'winner',
      showWinnerStar: false,
    };
  }

  // Succeeded + matched winner branch (expanded): pattern name + "winner" subtitle + star.
  if (options.winnerResolved && isWinner) {
    return {
      ...extras,
      label: options.winnerPatternLabel ?? topologyNode.label,
      labelSubtitle: 'winner',
      showWinnerStar: true,
      winnerRank: extras.winnerRank ?? 1,
    };
  }

  return extras;
};

const createEdge = (
  id: string,
  source: string,
  target: string,
  data?: EdgeModel['data'],
): EdgeModel => ({
  id,
  type: TREE_EDGE_TYPE,
  source,
  target,
  ...(data ? { data } : {}),
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
    patternsExpanded: true,
    winnerResolved: false,
  };
  const visibleBranchIndices = resolveVisibleBranchIndices(branchIndices, branches, expandOptions);
  const isCollapsedSpine = !expandOptions.patternsExpanded && branchIndices.length > 1;
  const hideExpandedBranchLabels = options?.patternsExpanded === true && branchIndices.length > 1;
  const includeAuxNodes = options != null && branchIndices.length > 1;

  let currentX: number = X_START;
  const linearPreIds: string[] = [];
  let predecessorFailed = false;

  for (const [index, topologyNode] of linearPre.entries()) {
    linearPreIds.push(topologyNode.id);
    const stepState = nextStepState(topologyNode, predecessorFailed);
    if (stepState === 'failed') {
      predecessorFailed = true;
    } else if (stepState === 'completed' || stepState === 'active') {
      predecessorFailed = false;
    }
    nodes.push(createTreeNode(topologyNode, currentX, Y_CENTER, stepState));
    currentX += X_GAP;
    if (index > 0) {
      edges.push(createEdge(`e-linear-${index}`, linearPreIds[index - 1], topologyNode.id));
    }
  }

  const branchSourceId = linearPreIds[linearPreIds.length - 1];
  const branchTailIds: string[] = [];
  const originOffset = (STANDARD_NODE_SIZE - BRANCH_STEP_NODE_SIZE) / 2;
  const needsFanOutLane = expandOptions.patternsExpanded && branchIndices.length > 1;
  const pipelineStartX = needsFanOutLane
    ? currentX +
      FAN_OUT_RUN +
      ROW_LABEL_WIDTH +
      ROW_LABEL_GAP -
      (X_GAP - STANDARD_NODE_SIZE) -
      originOffset
    : currentX;
  const displayYPositions = calculatePipelineYPositions(visibleBranchIndices.length);
  const columnXs: { id: string; label: string; x: number }[] = [];
  const rowLabels: { id: string; label: string; y: number }[] = [];
  let toggleMidX = pipelineStartX;
  let toggleMaxY = Y_CENTER;
  let anyBranchFailed = false;

  for (const [positionIndex, branchIndex] of visibleBranchIndices.entries()) {
    const branchNodes = branches.get(branchIndex) ?? [];
    const pipelineY = displayYPositions[positionIndex] ?? Y_CENTER;
    let stepX = pipelineStartX;
    const branchNodeIds: string[] = [];
    let branchFailed = predecessorFailed;
    const rowLabel = getPatternRowLabel(branchIndex);

    if (hideExpandedBranchLabels && rowLabel) {
      rowLabels.push({
        id: `autorag-row-label-${branchIndex}`,
        label: rowLabel,
        y: pipelineY,
      });
    }

    for (const [stepIndex, topologyNode] of branchNodes.entries()) {
      const stepState = nextStepState(topologyNode, branchFailed);
      if (stepState === 'failed') {
        branchFailed = true;
        anyBranchFailed = true;
      } else if (stepState === 'completed' || stepState === 'active') {
        branchFailed = false;
      }
      const isPatternTerminus = topologyNode.id.includes('__pattern__');
      const created = createTreeNode(
        topologyNode,
        stepX,
        pipelineY,
        stepState,
        isPatternTerminus
          ? patternTerminusExtras(
              topologyNode,
              expandOptions,
              isCollapsedSpine,
              hideExpandedBranchLabels,
            )
          : hideExpandedBranchLabels
            ? { hideLabel: true }
            : undefined,
      );
      nodes.push(created);
      if (hideExpandedBranchLabels && positionIndex === 0) {
        const parsed = parseStageMapNodeId(topologyNode.id);
        const headerLabel =
          parsed?.type === 'branch_step'
            ? topologyNode.label
            : isPatternTerminus
              ? PATTERN_RESULT_HEADER
              : topologyNode.label;
        columnXs.push({
          id: `autorag-col-header-${parsed?.type === 'branch_step' ? parsed.stepId : 'pattern'}`,
          label: headerLabel ?? '',
          x: (created.x ?? 0) + (created.width ?? STANDARD_NODE_SIZE) / 2 - X_GAP / 2,
        });
      }
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
    }

    if (branchSourceId && branchNodeIds[0]) {
      edges.push(
        createEdge(
          `e-pre-to-branch-${branchIndex}`,
          branchSourceId,
          branchNodeIds[0],
          hideExpandedBranchLabels ? { clearLabelLane: true } : undefined,
        ),
      );
    }

    const tailId = branchNodeIds[branchNodeIds.length - 1];
    if (tailId) {
      branchTailIds.push(tailId);
    }

    if (stepX > currentX) {
      currentX = stepX;
    }
    toggleMaxY = Math.max(toggleMaxY, pipelineY);
    toggleMidX = pipelineStartX + ((stepX - X_GAP - pipelineStartX) / 2 || 0);
  }

  // When every branch index is invalid (nodes fall into postBranch), connect from the pre-branch
  // tail so the converge edge logic below still runs.
  if (branchTailIds.length === 0 && branchSourceId) {
    branchTailIds.push(branchSourceId);
  }

  if (needsFanOutLane) {
    currentX += X_GAP * 0.5;
  }
  const postBranchIds: string[] = [];
  let postFailed = predecessorFailed || anyBranchFailed;

  postBranch.forEach((topologyNode, index) => {
    postBranchIds.push(topologyNode.id);
    const stepState = nextStepState(topologyNode, postFailed);
    if (stepState === 'failed') {
      postFailed = true;
    } else if (stepState === 'completed' || stepState === 'active') {
      postFailed = false;
    }
    nodes.push(createTreeNode(topologyNode, currentX, Y_CENTER, stepState));
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

  if (includeAuxNodes) {
    const headerY =
      Math.min(...displayYPositions, Y_CENTER) - COLUMN_HEADER_Y_OFFSET - STANDARD_NODE_SIZE;
    const headerRuleWidth =
      columnXs.length === 0 || !columnXs[0]
        ? undefined
        : columnXs[columnXs.length - 1].x - columnXs[0].x + X_GAP;
    columnXs.forEach((column) => {
      nodes.push({
        ...createAnnotationNode(column.id, column.x, headerY, {
          stepState: 'pending',
          label: column.label,
          nodeRole: 'column-header',
        }),
        width: X_GAP,
      });
    });
    if (headerRuleWidth !== undefined && columnXs[0]) {
      nodes.push({
        ...createAnnotationNode(
          'autorag-col-header-rule',
          columnXs[0].x,
          headerY + STANDARD_NODE_SIZE,
          {
            stepState: 'pending',
            nodeRole: 'column-rule',
          },
        ),
        width: headerRuleWidth,
        height: COLUMN_RULE_HEIGHT,
      });
    }
    rowLabels.forEach((row) => {
      const firstDotLeft = pipelineStartX + originOffset;
      const rowLabelOffset = (STANDARD_NODE_SIZE - ROW_LABEL_HEIGHT) / 2;
      nodes.push({
        ...createAnnotationNode(
          row.id,
          firstDotLeft - ROW_LABEL_GAP - ROW_LABEL_WIDTH,
          row.y + rowLabelOffset,
          {
            stepState: 'pending',
            label: row.label,
            nodeRole: 'row-label',
          },
        ),
        width: ROW_LABEL_WIDTH,
        height: ROW_LABEL_HEIGHT,
      });
    });
    nodes.push(
      createAnnotationNode(
        PATTERNS_TOGGLE_NODE_ID,
        toggleMidX,
        toggleMaxY + (isCollapsedSpine ? COLLAPSED_TOGGLE_Y_OFFSET : TOGGLE_Y_OFFSET),
        {
          stepState: 'pending',
          nodeRole: 'patterns-toggle',
          showPatternsToggle: true,
        },
      ),
    );
  }

  return { nodes, edges };
};
