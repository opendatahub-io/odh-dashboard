import type { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';

export type AdmissionMetricPoint = { x: number; y: number };

export type AdmissionMetric = {
  id: string;
  label: string;
  value: string;
  data: AdmissionMetricPoint[];
  color: string;
  interpolation?: 'linear' | 'stepAfter';
};

export const ADMISSION_TIME_WINDOW_OPTIONS: SimpleSelectOption[] = [
  { key: '1h', label: 'Last 1 hour' },
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

export const formatAdmissionMetricValue = (metricId: string, value: number): string => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  if (metricId === 'admission-rate') {
    return value === 0 ? '0' : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (metricId === 'admission-lead-time') {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return Math.round(value).toString();
};

export const getValidAdmissionMetricPoints = (
  data: AdmissionMetricPoint[],
): AdmissionMetricPoint[] =>
  data.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

export const getAdmissionMetricYBounds = (
  data: AdmissionMetricPoint[],
): { yMin: number; yMax: number; yPadding: number } => {
  const yValues = data.map((point) => point.y);
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 1;
  const yPadding = yMin === yMax ? Math.max(Math.abs(yMax) * 0.1, 1) : 0;

  return { yMin, yMax, yPadding };
};

export const getAdmissionMetricsXDomain = (metrics: AdmissionMetric[]): [number, number] => {
  const timestamps = metrics.flatMap((metric) =>
    metric.data
      .map((point) => point.x)
      .filter((timestamp): timestamp is number => Number.isFinite(timestamp)),
  );
  const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  const earliestTimestamp =
    timestamps.length > 0 ? Math.min(...timestamps) : latestTimestamp - 24 * 60 * 60 * 1000;

  return earliestTimestamp === latestTimestamp
    ? [earliestTimestamp - 1, latestTimestamp + 1]
    : [earliestTimestamp, latestTimestamp];
};

export const getAdmissionMetricHeadlineValue = (metric: AdmissionMetric): number | null => {
  const values = metric.data.map((point) => point.y).filter(Number.isFinite);

  if (metric.id === 'waiting-workloads' || metric.id === 'active-workloads') {
    return values.length > 0 ? Math.max(...values) : null;
  }

  return metric.data.at(-1)?.y ?? null;
};

export const formatAdmissionMetricHeadline = (
  metric: AdmissionMetric,
  value: number | null,
): string => {
  if (value === null) {
    return '--';
  }
  if (metric.id === 'admission-rate') {
    return `${value.toFixed(3)}/s`;
  }
  if (metric.id === 'admission-lead-time') {
    return `${value.toFixed(0)} ms`;
  }
  return `${value} ${metric.id === 'waiting-workloads' ? 'waiting' : 'active'}`;
};

export const buildAdmissionMetrics = (
  metrics: {
    admissionRate: { value: number | null; data: AdmissionMetricPoint[] };
    admissionLeadTime: { value: number | null; data: AdmissionMetricPoint[] };
    waitingWorkloads: { value: number | null; data: AdmissionMetricPoint[] };
    activeWorkloads: { value: number | null; data: AdmissionMetricPoint[] };
  },
  colors: { blue: string; orange: string },
  canAccessAdminMetrics: boolean,
): AdmissionMetric[] =>
  [
    {
      id: 'admission-rate',
      label: 'Admission rate',
      value:
        metrics.admissionRate.value === null ? '--' : `${metrics.admissionRate.value.toFixed(3)}/s`,
      data: metrics.admissionRate.data,
      color: colors.blue,
    },
    {
      id: 'admission-lead-time',
      label: 'Admission lead time',
      value:
        metrics.admissionLeadTime.value === null
          ? '--'
          : `${metrics.admissionLeadTime.value.toFixed(0)} ms`,
      data: metrics.admissionLeadTime.data,
      color: colors.blue,
    },
    {
      id: 'waiting-workloads',
      label: 'Waiting workloads',
      value:
        metrics.waitingWorkloads.value === null
          ? '--'
          : `${metrics.waitingWorkloads.value} waiting`,
      data: metrics.waitingWorkloads.data,
      color: colors.orange,
      interpolation: 'stepAfter' as const,
    },
    {
      id: 'active-workloads',
      label: 'Active workloads',
      value:
        metrics.activeWorkloads.value === null ? '--' : `${metrics.activeWorkloads.value} active`,
      data: metrics.activeWorkloads.data,
      color: colors.blue,
      interpolation: 'stepAfter' as const,
    },
  ].filter(
    (metric) =>
      canAccessAdminMetrics ||
      metric.id === 'waiting-workloads' ||
      metric.id === 'active-workloads',
  );
