import type { ScaleDetailsThresholds } from '@patternfly/react-topology';

export const PIPELINE_LAYOUT = 'PipelineLayout';
export const PIPELINE_NODE_SEPARATION_VERTICAL = 70;
export const PIPELINE_NODE_SEPARATION_HORIZONTAL = 150;

export const NODE_WIDTH = 130;
export const NODE_HEIGHT = 35;

export const EXECUTION_TASK_NODE_TYPE = 'EXECUTION_TASK_NODE';

/**
 * Keep pipeline graphs at PatternFly's high details level at every zoom, so task and group
 * headings always render and edge anchors and labels use full-pill geometry. Below high detail,
 * PatternFly anchors and group-label positions assume details are hidden. Use zero thresholds
 * rather than undefined; PatternFly reads `medium` from this object.
 */
export const PIPELINE_DETAILS_LEVEL_THRESHOLDS: ScaleDetailsThresholds = { low: 0, medium: 0 };

/** Magnify a hovered node when the graph scale is at or below this value. */
export const NODE_HOVER_SCALE_MAX_ZOOM = 0.5;
