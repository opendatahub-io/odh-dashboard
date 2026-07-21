export const INFRASTRUCTURE_REFRESH_INTERVAL = 30_000;

export const TREND_REFRESH_INTERVAL = 5 * 60 * 1000;

export const INFRASTRUCTURE_SECTIONS = [
  {
    id: 'cluster',
    title: 'Summary',
    description: 'Cluster-wide accelerator allocation and average compute and memory consumption.',
    isPlain: true,
  },
  {
    id: 'hardware-usage',
    title: 'Hardware usage',
    description: 'Accelerator counts by hardware type.',
    isPlain: false,
  },
  {
    id: 'borrowing-lending',
    title: 'Borrowing and lending',
    description:
      '7-day borrowing and lending trends by cluster queue. When a cluster queue uses its full quota, it can borrow accelerators from other queues. ',
    isPlain: false,
  },
  {
    id: 'cluster-queue-utilization',
    title: 'Cluster queue consumption',
    description: 'Cluster queue accelerator consumption grouped by cohort.',
    isPlain: true,
  },
] as const;

export const ACCELERATOR_RESOURCE_REGEX =
  'nvidia.com/gpu|nvidia.com/mig.*|amd.com/gpu|habana.ai/gaudi';

/** k8s resource name prefixes used to identify GPU resources in ClusterQueue specs. */
export const ACCELERATOR_RESOURCE_PREFIXES = ['nvidia.com/', 'amd.com/', 'habana.ai/'];

// PromQL queries for the Cluster summary section
// These are formatted as URL query strings for the Prometheus API (appended after /api/v1/query?)
// Values must be encoded to avoid + being decoded as space
export const PROMQL_ACCELERATOR_ALLOCATABLE = `query=${encodeURIComponent(
  'sum(kube_node_status_allocatable{resource=~"nvidia.com/gpu|nvidia_com_gpu|amd.com/gpu|amd_com_gpu|habana.ai/gaudi|habana_ai_gaudi|nvidia.com/mig.*"})',
)}`;

export const PROMQL_ACCELERATOR_IN_USE = `query=${encodeURIComponent(
  'sum(kube_pod_container_resource_requests{resource=~"nvidia.com/gpu|nvidia_com_gpu|amd.com/gpu|amd_com_gpu|habana.ai/gaudi|habana_ai_gaudi|nvidia.com/mig.*"})',
)}`;

export const PROMQL_COMPUTE_UTILIZATION = `query=${encodeURIComponent(
  'avg(avg_over_time(DCGM_FI_PROF_GR_ENGINE_ACTIVE[30m])) * 100',
)}`;

export const PROMQL_MEMORY_UTILIZATION = `query=${encodeURIComponent(
  'avg(DCGM_FI_DEV_FB_USED / (DCGM_FI_DEV_FB_USED + DCGM_FI_DEV_FB_FREE)) * 100',
)}`;

// PromQL queries for the Hardware usage section (per-model breakdown)
export const PROMQL_HARDWARE_TOTAL = `query=${encodeURIComponent(
  'count by (modelName)(DCGM_FI_PROF_GR_ENGINE_ACTIVE)',
)}`;

export const PROMQL_HARDWARE_IN_USE = `query=${encodeURIComponent(
  'count by (modelName)(DCGM_FI_PROF_GR_ENGINE_ACTIVE{pod!=""})',
)}`;

export const PROMQL_HARDWARE_NODE_LABELS = `query=${encodeURIComponent(
  'count by (label_nvidia_com_gpu_product, label_amd_com_gpu_product, label_habana_ai_gaudi, label_intel_com_gpu_product)(kube_node_labels{label_nvidia_com_gpu_product!=""} or kube_node_labels{label_amd_com_gpu_product!=""} or kube_node_labels{label_habana_ai_gaudi!=""} or kube_node_labels{label_intel_com_gpu_product!=""})',
)}`;
export const PROMQL_COMPUTE_BY_MODEL = `query=${encodeURIComponent(
  'avg by (modelName) (avg_over_time(DCGM_FI_PROF_GR_ENGINE_ACTIVE[30m])) * 100',
)}`;

export const PROMQL_MEMORY_BY_MODEL = `query=${encodeURIComponent(
  'avg by (modelName) (DCGM_FI_DEV_FB_USED / (DCGM_FI_DEV_FB_USED + DCGM_FI_DEV_FB_FREE)) * 100',
)}`;

/** Shared dimensions for all CQ accelerator donut charts (Total, Compute, Memory columns). */
export const CQ_DONUT_SIZE = 175;
export const CQ_DONUT_INNER_RADIUS = 76;

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const CHART_HEIGHT = 400;
export const CHART_PADDING = { left: 55, right: 220, bottom: 50, top: 40 };
/** Max width cap used for the right-vs-left flip calculation. Actual rendered width is auto. */
export const FLYOUT_MAX_WIDTH = 360;
export const CURSOR_GAP = 14;
/**
 * Max characters allowed in an SVG legend label before it is truncated.
 * Derived from CHART_PADDING.right (220px) minus symbol + gap (~30px) at ~7px/char ≈ 27.
 */
export const LEGEND_MAX_CHARS = 27;

/** Number of tooltip entries shown before the "View more" footer appears. */
export const TOOLTIP_PAGE_SIZE = 5;

/** Max height (px) of the scrollable content area inside the pinned tooltip panel. */
export const TOOLTIP_PANEL_MAX_HEIGHT = 300;

/** Estimated total height (px) of the pinned tooltip panel (header + content + footer) for viewport-flip calculations. */
export const TOOLTIP_PANEL_TOTAL_HEIGHT = 420;

export const AXIS_DIRECTION_LABEL_STYLE = {
  fontWeight: 'bold',
  fontSize: 12,
  fill: 'var(--pf-t--global--text--color--subtle)',
};
