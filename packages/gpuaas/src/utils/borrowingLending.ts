export type BorrowingMetricPoint = {
  timestampMs: number;
  gpuUsage: number;
  borrowedAmount: number;
};

export const mapPrometheusValuesToBorrowingPoints = (
  values: [number, string][],
  nominalQuota: number,
): BorrowingMetricPoint[] =>
  values.flatMap(([timestamp, valueStr]) => {
    const timestampMs = timestamp * 1000;
    const gpuUsage = Number(valueStr);
    if (valueStr.trim() === '' || !Number.isFinite(gpuUsage) || !Number.isFinite(timestampMs)) {
      return [];
    }
    return [
      {
        timestampMs,
        gpuUsage,
        borrowedAmount: Math.max(0, gpuUsage - nominalQuota),
      },
    ];
  });

/** First timestamp of the current borrowing episode in sorted Prometheus points. */
export const findCurrentBorrowingSinceMs = (points: BorrowingMetricPoint[]): number | undefined => {
  if (points.length === 0) {
    return undefined;
  }

  const sorted = points.toSorted((a, b) => a.timestampMs - b.timestampMs);
  const latestPoint = sorted[sorted.length - 1];
  if (latestPoint.borrowedAmount <= 0) {
    return undefined;
  }

  let index = sorted.length - 1;

  while (index >= 0 && sorted[index].borrowedAmount > 0) {
    index -= 1;
  }

  return sorted[index + 1].timestampMs;
};

export const formatBorrowingSinceDate = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
};
