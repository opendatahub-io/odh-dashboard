import { DEFAULT_TASK_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import {
  PipelineTask,
  PipelineNodeModelExpanded,
  type ActiveIconVariant,
} from '~/app/types/topology';
import { NODE_FONT, NODE_HEIGHT, NODE_PADDING, NODE_WIDTH } from './const';

let cachedCtx: CanvasRenderingContext2D | null = null;
const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (!cachedCtx && typeof document !== 'undefined') {
    cachedCtx = document.createElement('canvas').getContext('2d');
  }
  return cachedCtx;
};

/** Measured width for layout (canvas text + padding). */
export const measurePipelineTaskLabelWidth = (text: string): number => {
  const ctx = getCanvasContext();
  if (!ctx) {
    return NODE_WIDTH;
  }
  ctx.font = NODE_FONT;
  const measuredTextWidth = Math.ceil(ctx.measureText(text).width);
  return Math.max(NODE_WIDTH, measuredTextWidth + NODE_PADDING);
};

// Stage-map topologies have many nodes (steps × branches) so variable chrome
// makes the graph too wide. Hardcode a fixed value until we have fewer nodes.
const LAYOUT_CHROME = 32;

/** Full layout width for a task node: text measure + fixed chrome. */
export const measurePipelineTaskNodeLayoutWidth = (label: string): number =>
  measurePipelineTaskLabelWidth(label) + LAYOUT_CHROME;

export type CreateNodeOptions = {
  id: string;
  label: string;
  pipelineTask: PipelineTask;
  runAfterTasks?: string[];
  runStatus?: RunStatus;
  activeIconVariant?: ActiveIconVariant;
};

export const createNode = ({
  id,
  label,
  pipelineTask,
  runAfterTasks,
  runStatus,
  activeIconVariant,
}: CreateNodeOptions): PipelineNodeModelExpanded => ({
  id,
  label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: measurePipelineTaskNodeLayoutWidth(label),
  height: NODE_HEIGHT,
  runAfterTasks,
  data: {
    pipelineTask,
    runStatus,
    activeIconVariant,
  },
});
