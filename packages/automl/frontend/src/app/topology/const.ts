export const PIPELINE_LAYOUT = 'PipelineLayout';
export const PIPELINE_NODE_SEPARATION_VERTICAL = 20;
/** Fallback horizontal rank gap when node widths are not yet known. */
export const PIPELINE_NODE_SEPARATION_HORIZONTAL = 32;

/** Baseline (px) in `computePipelineRankSep`; upper bound is `PIPELINE_RANKSEP_MAX`. */
export const PIPELINE_RANKSEP_MIN = 2;
export const PIPELINE_RANKSEP_MAX = 10;

/**
 * Derive Dagre `ranksep` from the widest task node in the graph so short pipelines stay compact
 * and long-label pipelines get extra horizontal space automatically.
 */
export function computePipelineRankSep(maxNodeLayoutWidth: number): number {
  if (!Number.isFinite(maxNodeLayoutWidth) || maxNodeLayoutWidth <= 0) {
    return PIPELINE_NODE_SEPARATION_HORIZONTAL;
  }
  const scaled = Math.round(PIPELINE_RANKSEP_MIN + maxNodeLayoutWidth * 0.028);
  return Math.min(PIPELINE_RANKSEP_MAX, scaled);
}

/** Padding passed to `Graph.fit` after layout (smaller = graph uses more of the viewport). */
export const PIPELINE_TOPOLOGY_FIT_PADDING = 16;

export const NODE_WIDTH = 120;
export const NODE_PADDING = 32;
export const NODE_HEIGHT = 50;

// Must match canvas measurement to the effective pill label font (see AutomlResults.scss overrides).
export const NODE_FONT = '1rem RedHatText, sans-serif';
