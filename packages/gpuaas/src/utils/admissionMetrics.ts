import type {
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '@odh-dashboard/ui-core/types/metrics';

export type AdmissionMetricPoint = { x: number; y: number };

export const ADMISSION_METRIC_IDS = {
  rate: 'admission-rate',
  leadTime: 'admission-lead-time',
  waiting: 'waiting-workloads',
  active: 'active-workloads',
} as const;

const RATE_LABEL_WIDTH_FOR_EXTRA_GRID = 6;
const LEAD_TIME_LABEL_WIDTH_FOR_EXTRA_GRID = 5;

export const getAdmissionChartGridLeft = (metricId: string, labelWidth: number): number => {
  if (metricId === ADMISSION_METRIC_IDS.rate) {
    return labelWidth >= RATE_LABEL_WIDTH_FOR_EXTRA_GRID ? 45 : 35;
  }
  if (metricId === ADMISSION_METRIC_IDS.leadTime) {
    return labelWidth >= LEAD_TIME_LABEL_WIDTH_FOR_EXTRA_GRID ? 50 : 30;
  }
  return 20;
};

export type AdmissionMetricSeries = {
  value: number | null;
  data: AdmissionMetricPoint[];
};

const PROMETHEUS_LABEL_VALUE_ESCAPE_REGEX = /[\\^$.*+?()[\]{}|]/g;

export const buildLabelSelector = (labelsToMatch: Record<string, string[]>): string => {
  const labels = Object.entries(labelsToMatch)
    .filter(([, values]) => values.length > 0)
    .map(
      ([key, values]) =>
        `${key}=~${JSON.stringify(
          `^(${values
            .map((value) => value.replace(PROMETHEUS_LABEL_VALUE_ESCAPE_REGEX, '\\$&'))
            .join('|')})$`,
        )}`,
    )
    .join(',');
  return labels ? `{${labels}}` : '';
};

export const buildAdmissionRateQuery = (clusterQueues: string[], rateWindow = '5m'): string =>
  `sum(rate(kueue_admitted_workloads_total${buildLabelSelector({
    // eslint-disable-next-line camelcase
    cluster_queue: clusterQueues,
  })}[${rateWindow}]))`;

export const buildAdmissionLeadTimeQuery = (clusterQueues: string[], rateWindow = '5m'): string =>
  `histogram_quantile(0.5, sum by (le) (rate(kueue_admission_wait_time_seconds_bucket${buildLabelSelector(
    {
      // eslint-disable-next-line camelcase
      cluster_queue: clusterQueues,
    },
  )}[${rateWindow}])))`;

export const buildWaitingWorkloadsQuery = (localQueues: string[]): string =>
  `sum(kueue_local_queue_pending_workloads${buildLabelSelector({
    name: localQueues,
    status: ['active'],
  })})`;

export const buildActiveWorkloadsQuery = (localQueues: string[]): string =>
  `sum(kueue_local_queue_admitted_active_workloads${buildLabelSelector({ name: localQueues })})`;

export const admissionMetricResponsePredicate = (
  data: PrometheusQueryRangeResponseData,
): PrometheusQueryRangeResponseDataResult[] => data.result ?? [];

const getSeriesValues = (
  results: PrometheusQueryRangeResponseDataResult[],
): PrometheusQueryRangeResultValue[] => {
  const valuesByTimestamp = new Map<number, number[]>();
  results.forEach((result) => {
    result.values.forEach(([timestamp, rawValue]) => {
      const value = Number(rawValue);
      if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
        return;
      }
      const values = valuesByTimestamp.get(timestamp) ?? [];
      values.push(value);
      valuesByTimestamp.set(timestamp, values);
    });
  });

  return [...valuesByTimestamp.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([timestamp, values]) => [
      timestamp,
      String(values.reduce((sum, value) => sum + value, 0)),
    ]);
};

export const mapAdmissionMetricSeries = (
  results: PrometheusQueryRangeResponseDataResult[],
  transform: (value: number) => number = (value) => value,
): AdmissionMetricSeries => {
  const data = getSeriesValues(results).flatMap(([timestamp, rawValue]) => {
    const value = Number(rawValue);
    const transformedValue = transform(value);
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(timestamp) ||
      !Number.isFinite(transformedValue)
    ) {
      return [];
    }
    return [{ x: timestamp * 1000, y: transformedValue }];
  });

  return { value: data.at(-1)?.y ?? null, data };
};

export const mapAdmissionLeadTimeSeries = (
  results: PrometheusQueryRangeResponseDataResult[],
): AdmissionMetricSeries => mapAdmissionMetricSeries(results, (value) => value * 1000);
