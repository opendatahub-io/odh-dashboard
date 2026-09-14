import type { SortableData } from '@odh-dashboard/ui-core';
import type { QuotaUsageAcceleratorRow } from './types';

export const INFRASTRUCTURE_PAGE_DESCRIPTION =
  'View accelerator utilization, cluster queue cohort configuration, and workload details.';

export const KUEUE_HELP_LINK_TEXT = "Not seeing what you're looking for?";
export const KUEUE_HELP_POPOVER_BODY =
  "This page shows data from projects managed by Kueue. Projects without a local queue aren't part of queue-based resource management.";
export const KUEUE_HELP_VIEW_PROJECTS_LINK = 'View projects not managed by Kueue';
export const NON_KUEUE_PROJECTS_MODAL_TITLE = 'Projects not managed by Kueue';
export const NON_KUEUE_PROJECTS_MODAL_DESCRIPTION =
  'Data from the following projects is not displayed on the Infrastructure page because they do not use Kueue for workload admission.';
export const NON_KUEUE_PROJECT_STATUS_LABEL = 'not Kueue-managed';

export const CLUSTER_QUEUE_WORKLOADS_SECTION_TITLE = 'Workloads';
export const CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION =
  'Workloads admitted or waiting in this cluster queue.';
export const CLUSTER_QUEUE_WORKLOADS_EMPTY_TITLE = 'No workloads';
export const CLUSTER_QUEUE_WORKLOADS_EMPTY_BODY = 'Admitted or waiting workloads will appear here.';
export const CLUSTER_QUEUE_WORKLOADS_TYPE_HELP =
  'The type of workload: train job, Ray job, notebook, inference, or Ray cluster.';

export enum ClusterQueueWorkloadsToolbarFilterOptions {
  status = 'status',
  priority = 'priority',
  hardwareProfile = 'hardwareProfile',
}

export const clusterQueueWorkloadsFilterOptions: Record<
  ClusterQueueWorkloadsToolbarFilterOptions,
  string
> = {
  [ClusterQueueWorkloadsToolbarFilterOptions.status]: 'Status',
  [ClusterQueueWorkloadsToolbarFilterOptions.priority]: 'Priority',
  [ClusterQueueWorkloadsToolbarFilterOptions.hardwareProfile]: 'Hardware profile',
};

export const clusterQueueWorkloadsFilterPlaceholders: Record<
  ClusterQueueWorkloadsToolbarFilterOptions,
  string
> = {
  [ClusterQueueWorkloadsToolbarFilterOptions.status]: 'Filter by status',
  [ClusterQueueWorkloadsToolbarFilterOptions.priority]: 'Filter by priority',
  [ClusterQueueWorkloadsToolbarFilterOptions.hardwareProfile]: 'Filter by hardware profile',
};

export const INFRASTRUCTURE_REFRESH_INTERVAL = 30_000;

/** Pass to useFetch refreshRate to disable polling; initial load + manual refresh only. */
export const INFRASTRUCTURE_MANUAL_REFRESH_ONLY = -1;

/** 5m polling for trend charts and quota-usage workload tables (see useBorrowingLendingMetrics). */
export const TREND_REFRESH_INTERVAL = 5 * 60 * 1000;
export const PROMETHEUS_CLUSTER_QUERY_PATH = '/api/prometheus/cluster/query';
export const PROMETHEUS_CLUSTER_QUERY_RANGE_PATH = '/api/prometheus/cluster/queryRange';

export const INFRASTRUCTURE_TABS = [
  { id: 'utilization', title: 'Accelerator utilization' },
  { id: 'quota-usage', title: 'Quota usage' },
] as const;

export type InfrastructureTabId = (typeof INFRASTRUCTURE_TABS)[number]['id'];

export const QUOTA_USAGE_DESCRIPTION =
  'View quota usage across cluster queues, which are entry points for workloads to access defined pools of hardware resources. Cluster queues organized into cohorts can borrow accelerators from the defined pool.';

export const QUOTA_USAGE_EMPTY_TITLE = 'No accelerator cluster queues found';
export const QUOTA_USAGE_EMPTY_BODY =
  'No cluster queues with accelerator resources were detected. Configure cluster queues with GPU resource quotas to see utilization here.';
export const QUOTA_USAGE_ERROR_TITLE = 'Error loading cluster queue data';

export const QUOTA_UNASSIGNED_NODE_ID = 'quota-unassigned';
export const QUOTA_UNASSIGNED_LABEL = 'Unassigned';
export const QUOTA_UNASSIGNED_TOOLTIP = 'Cluster queues not assigned to a cohort.';
export const QUOTA_USAGE_TREE_DRAWER_PANEL_ID = 'quota-usage-tree-drawer-panel';

export const QUOTA_USAGE_SUMMARY = {
  title: 'Summary',
  workloads: 'Workloads',
  acceleratorTableTitle: 'Accelerator usage',
  viewKueueProjects: 'View Kueue projects',
  capacity: 'Accelerators allocated',
  compute: 'Accelerator compute',
  memory: 'Accelerator memory',
  help: {
    capacity: 'GPU units in use compared to nominal quota from the cluster queue resource groups.',
    compute: 'Average DCGM compute utilization across accelerator models in this selection.',
    memory: 'Average DCGM memory utilization across accelerator models in this selection.',
  },
} as const;

export const QUOTA_USAGE_ACCELERATOR_TABLE = {
  acceleratorTableTitle: 'Accelerator usage',
  acceleratorTableSubtitle: 'Accelerator capacity, compute, and memory usage.',
  empty: 'No accelerator model details are available for this selection.',
  columnLabels: {
    accelerator: 'Accelerator',
    capacity: 'Capacity',
    compute: 'Compute',
    memory: 'Memory',
  },
  help: {
    capacity: 'In-use GPU units compared to nominal quota for this model.',
    compute: 'DCGM compute utilization for this accelerator model.',
    memory: 'DCGM memory utilization for this accelerator model.',
  },
} as const;

export const QUOTA_USAGE_ACCELERATOR_TABLE_COLUMNS: SortableData<QuotaUsageAcceleratorRow>[] = [
  { label: QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.accelerator, field: 'model', sortable: true },
  {
    label: QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.capacity,
    field: 'nominal',
    sortable: true,
    info: {
      popover:
        'The number of accelerators that are in use (blue) of the total quota allocated for each accelerator.',
      popoverProps: {
        position: 'top',
      },
    },
  },
  {
    label: QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.compute,
    field: 'computePercentage',
    sortable: true,
    info: {
      popover: "The percentage of the accelerator's total processing power being used",
      popoverProps: {
        position: 'top',
      },
    },
  },
  {
    label: QUOTA_USAGE_ACCELERATOR_TABLE.columnLabels.memory,
    field: 'memoryPercentage',
    sortable: true,
    info: {
      popover: "The percentage of the accelerator's memory being used.",
      popoverProps: {
        position: 'top',
      },
    },
  },
];

export const QUOTA_USAGE_METER = {
  overQuotaTooltip: 'Over quota',
} as const;

export const QUOTA_USAGE_BORROWING = {
  enabledLabel: 'Borrowing enabled',
  label: (count: number, cohortName: string): string =>
    `Borrowing ${count} ${cohortName} accelerators`,
  popoverBorrowingLabel: 'Borrowing:',
  popoverSinceLabel: 'Since:',
  popoverModelLine: (count: number, model: string): string => `${count} x ${model}`,
  cohortCalloutSuffix: (cohortName: string): string => ` is borrowing ${cohortName} accelerators`,
} as const;

export const INFRASTRUCTURE_SECTIONS = [
  {
    id: 'cluster',
    tab: 'utilization',
    title: 'Summary',
    description: 'Cluster-wide accelerator allocation and average compute and memory consumption.',
    isPlain: true,
    refreshBadgeTestId: undefined,
    showKueueHelpLink: false,
  },
  {
    id: 'hardware-usage',
    tab: 'utilization',
    title: 'Hardware usage',
    description: 'Accelerator counts by hardware type.',
    isPlain: false,
    refreshBadgeTestId: undefined,
    showKueueHelpLink: false,
  },
  {
    id: 'borrowing',
    tab: 'utilization',
    title: 'Borrowing trends',
    description:
      '7-day borrowing trends by cluster queue. When a cluster queue uses its full quota, it can borrow accelerators from other queues.',
    isPlain: false,
    refreshBadgeTestId: undefined,
    showKueueHelpLink: false,
  },
  {
    id: 'quota-usage',
    tab: 'quota-usage',
    title: 'Quota usage',
    description: QUOTA_USAGE_DESCRIPTION,
    isPlain: true,
    refreshBadgeTestId: 'quota-usage-refresh-badge',
    showKueueHelpLink: true,
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
