export const INFRASTRUCTURE_REFRESH_INTERVAL = 30_000;

export const INFRASTRUCTURE_SECTIONS = [
  { id: 'cluster', title: 'Cluster' },
  { id: 'hardware-usage', title: 'Hardware usage' },
  { id: 'borrowing-lending', title: 'Borrowing & lending' },
  { id: 'cluster-queue-utilization', title: 'Cluster queue utilization' },
] as const;
