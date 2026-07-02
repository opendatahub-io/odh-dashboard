export const INFRASTRUCTURE_REFRESH_INTERVAL = 30_000;

export const INFRASTRUCTURE_SECTIONS = [
  { id: 'cluster', title: 'Cluster' },
  { id: 'hardware-usage', title: 'Hardware usage' },
  { id: 'borrowing-lending', title: 'Borrowing & lending' },
  { id: 'cluster-queue-utilization', title: 'Cluster queue utilization' },
] as const;

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
