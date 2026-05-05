import { DEFAULT_TASK_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import { PipelineTask, PipelineNodeModelExpanded } from '~/app/types/topology';
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

/** Layout chrome (status icon, pill padding) — scales slightly with label length. */
const layoutChromeForTaskLabel = (label: string): number => {
  const base = 40;
  // Slightly sub-linear growth so long labels add chrome without dominating (tunable UX constant).
  const fromLength = Math.min(80, Math.ceil(label.length * 0.9));
  return base + fromLength;
};

/** Full layout width for a task node: text measure + length-aware chrome. */
export const measurePipelineTaskNodeLayoutWidth = (label: string): number =>
  measurePipelineTaskLabelWidth(label) + layoutChromeForTaskLabel(label);

export const createNode = (
  id: string,
  label: string,
  pipelineTask: PipelineTask,
  runAfterTasks?: string[],
  runStatus?: RunStatus,
  /** Override computed width (e.g. in unit tests). */
  layoutWidth?: number,
): PipelineNodeModelExpanded => ({
  id,
  label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: layoutWidth ?? measurePipelineTaskNodeLayoutWidth(label),
  height: NODE_HEIGHT,
  runAfterTasks,
  data: {
    pipelineTask,
    runStatus,
  },
});
