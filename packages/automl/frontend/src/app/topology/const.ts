export const PIPELINE_LAYOUT = 'PipelineLayout';
export const PIPELINE_NODE_SEPARATION_VERTICAL = 20;
/** Fallback horizontal rank gap when node widths are not yet known. */
export const PIPELINE_NODE_SEPARATION_HORIZONTAL = 96;

/** Rank gap bounds; `computePipelineRankSep` scales with widest laid-out node. */
export const PIPELINE_RANKSEP_MIN = 72;
export const PIPELINE_RANKSEP_MAX = 200;

/**
 * Derive Dagre `ranksep` from the widest task node in the graph so short pipelines stay compact
 * and long-label pipelines get extra horizontal space automatically.
 */
export function computePipelineRankSep(maxNodeLayoutWidth: number): number {
  if (!maxNodeLayoutWidth || maxNodeLayoutWidth <= 0) {
    return PIPELINE_NODE_SEPARATION_HORIZONTAL;
  }
  const scaled = Math.round(PIPELINE_RANKSEP_MIN + maxNodeLayoutWidth * 0.1);
  return Math.min(PIPELINE_RANKSEP_MAX, Math.max(PIPELINE_RANKSEP_MIN, scaled));
}

export const NODE_WIDTH = 200;
export const NODE_PADDING = 40;
export const NODE_HEIGHT = 35;

// Must match the font rendered by PatternFly topology task nodes
// See: @patternfly/react-topology TaskNode component (font-size: 0.875rem, font-family: RedHatText)
export const NODE_FONT = '0.875rem RedHatText';
