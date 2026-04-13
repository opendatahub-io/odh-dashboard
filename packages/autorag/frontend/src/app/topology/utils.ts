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

const measureTextWidth = (text: string): number => {
  const ctx = getCanvasContext();
  if (!ctx) {
    return NODE_WIDTH;
  }
  ctx.font = NODE_FONT;
  return Math.max(NODE_WIDTH, ctx.measureText(text).width + NODE_PADDING);
};

export const createNode = (
  id: string,
  label: string,
  pipelineTask: PipelineTask,
  runAfterTasks?: string[],
  runStatus?: RunStatus,
): PipelineNodeModelExpanded => ({
  id,
  label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: measureTextWidth(label),
  height: NODE_HEIGHT,
  runAfterTasks,
  data: {
    pipelineTask,
    runStatus,
  },
});
