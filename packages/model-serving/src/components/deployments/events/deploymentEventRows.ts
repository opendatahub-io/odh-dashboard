export type DeploymentEventRow = {
  uid: string;
  severity: string;
  reason: string;
  message: string;
  source: string;
  timestamp?: number;
};

export type EventSeverityFilter = 'All' | 'Warning' | 'Normal';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value ? value : fallback;

export const toDeploymentEventRows = (
  sourceUid: string,
  items: readonly unknown[],
): DeploymentEventRow[] =>
  items.flatMap((item) => {
    const metadata = field(item, 'metadata');
    const uid = field(metadata, 'uid');
    const source = field(item, 'involvedObject');
    if (typeof uid !== 'string' || !uid || field(source, 'uid') !== sourceUid) {
      return [];
    }
    const timestamp = [
      field(field(item, 'series'), 'lastObservedTime'),
      field(item, 'lastTimestamp'),
      field(item, 'eventTime'),
      field(item, 'firstTimestamp'),
      field(metadata, 'creationTimestamp'),
    ]
      .map((value) => (typeof value === 'string' ? Date.parse(value) : NaN))
      .find(Number.isFinite);
    return [
      {
        uid,
        severity: text(field(item, 'type'), 'Unknown'),
        reason: text(field(item, 'reason'), 'Unknown reason'),
        message: text(field(item, 'message'), 'No message'),
        source: `${text(field(source, 'kind'), 'Unknown kind')}/${text(
          field(source, 'name'),
          'Unknown name',
        )}`,
        timestamp,
      },
    ];
  });

export const filterDeploymentEventRows = (
  rows: readonly DeploymentEventRow[],
  search: string,
  severity: EventSeverityFilter,
): DeploymentEventRow[] => {
  const term = search.trim().toLowerCase();
  return rows
    .filter(
      (row) =>
        (severity === 'All' || row.severity === severity) &&
        [row.reason, row.message, row.source].some((value) => value.toLowerCase().includes(term)),
    )
    .toSorted((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.uid.localeCompare(b.uid);
      }
      return (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity);
    });
};
