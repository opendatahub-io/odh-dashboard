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

const ADMISSION_TOOLTIP_DATE_TIME_WINDOWS = new Set(['7d', '30d']);
const ADMISSION_DATE_ONLY_WINDOWS = new Set(['7d', '30d']);
const ADMISSION_TIME_ONLY_WINDOWS = new Set(['24h']);
const ADMISSION_TICK_INTERVALS: Record<string, number> = {
  '1h': 15 * 60 * 1000,
  '24h': 5 * 60 * 60 * 1000,
  '7d': 2 * 24 * 60 * 60 * 1000,
  '30d': 6 * 24 * 60 * 60 * 1000,
};

export const getAdmissionTickInterval = (timeWindow: string): number | undefined =>
  ADMISSION_TICK_INTERVALS[timeWindow];

export const formatAdmissionTimestamp = (
  timestamp: number,
  timeWindow: string,
  domain?: [number, number],
): string => {
  const date = new Date(timestamp);
  const spansMultipleCalendarDays =
    domain !== undefined &&
    new Date(domain[0]).toDateString() !== new Date(domain[1]).toDateString();

  if (ADMISSION_DATE_ONLY_WINDOWS.has(timeWindow)) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  if (ADMISSION_TIME_ONLY_WINDOWS.has(timeWindow)) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return spansMultipleCalendarDays || domain === undefined
    ? date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
};

export const formatAdmissionTooltipTimestamp = (timestamp: number, timeWindow = '1h'): string => {
  const date = new Date(timestamp);
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  return ADMISSION_TOOLTIP_DATE_TIME_WINDOWS.has(timeWindow)
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : date.toLocaleTimeString([], timeOptions);
};

export const formatAdmissionMetricValue = (metricId: string, value: number): string => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  if (metricId === 'admission-rate') {
    const formatted = value === 0 ? '0' : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    return `${formatted}/s`;
  }
  if (metricId === 'admission-lead-time') {
    if (value >= 1000) {
      const seconds = Number((value / 1000).toFixed(1));
      return `${seconds}s`;
    }
    return `${Math.round(value)}ms`;
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

export const getAdmissionMetricYInterval = (metricId: string, yMax = 0): number | undefined =>
  metricId === 'waiting-workloads' || metricId === 'active-workloads'
    ? Math.max(1, Math.ceil(yMax / 5))
    : undefined;

export const getAdmissionMetricsXDomain = (
  spanInSeconds: number,
  endInMs = Date.now(),
): [number, number] => [endInMs - spanInSeconds * 1000, endInMs];

export const getAdmissionMetricHeadlineValue = (metric: AdmissionMetric): number | null => {
  const values = metric.data.map((point) => point.y).filter(Number.isFinite);

  if (values.length === 0) {
    return null;
  }

  if (metric.id === 'waiting-workloads' || metric.id === 'active-workloads') {
    return Math.max(...values);
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const formatAdmissionMetricHeadline = (
  metric: AdmissionMetric,
  value: number | null,
): string => {
  if (value === null) {
    return '--';
  }
  if (metric.id === 'admission-rate') {
    const decimalPlaces = value > 0 && value < 0.001 ? 6 : 3;
    return `${value.toFixed(decimalPlaces)}/s`;
  }
  if (metric.id === 'admission-lead-time') {
    return formatAdmissionMetricValue(metric.id, value);
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
          : formatAdmissionMetricValue('admission-lead-time', metrics.admissionLeadTime.value),
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
      color: colors.blue,
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
