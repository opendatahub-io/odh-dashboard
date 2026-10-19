/**
 * Shared AutoX generic utilities (non-React, non-hook helper functions).
 *
 * See ../../ARCHITECTURE.md for the full layering conventions.
 */
export { NODE_WIDTH, NODE_PADDING, NODE_HEIGHT, NODE_FONT } from './topology/const';
export {
  buildTreeEdgePath,
  fanOutLabelClearX,
  ROW_LABEL_GAP,
  ROW_LABEL_WIDTH,
} from './topology/treeEdgePath';
export type { TreeEdgeBounds } from './topology/treeEdgePath';
export { parseErrorStatus } from './parseErrorStatus';
export { formatMissingKeysMessage, getMissingRequiredKeys } from './secretValidation';
export {
  getPipelineTaskAttemptTimestamp,
  getPipelineTaskTiming,
  type PipelineTaskTiming,
} from './pipelineTaskTiming';
