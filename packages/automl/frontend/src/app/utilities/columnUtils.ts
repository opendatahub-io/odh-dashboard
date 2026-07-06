import type { ColumnSchema } from '~/app/hooks/queries';

/** Distinct value count from schema inference (sample-based). */
export const getTargetColumnUniqueValueCount = (
  column: ColumnSchema | undefined,
): number | undefined => {
  if (!column) {
    return undefined;
  }
  if (column.unique_count != null) {
    return column.unique_count;
  }
  return column.values?.length;
};

export const formatTargetColumnUniqueValuesMessage = (
  columnName: string,
  count: number,
): string => {
  const label = count === 1 ? 'value' : 'values';
  return `${count} unique ${label} detected in "${columnName}"`;
};

const TIMESTAMP_NAME_PATTERNS = [
  /^timestamp$/i,
  /^datetime$/i,
  /^date[_-]?time$/i,
  /^time[_-]?stamp$/i,
  /^date$/i,
  /^time$/i,
  /^dt$/i,
  /^ds$/i,
  /^ts$/i,
  /^created[_-]?at$/i,
  /^updated[_-]?at$/i,
  /^recorded[_-]?at$/i,
  /^event[_-]?time$/i,
];

export const findTimestampColumn = (
  columns: { name: string; type: string }[],
): string | undefined => {
  const byType = columns.find((c) => c.type === 'timestamp');
  if (byType) {
    return byType.name;
  }
  const byName = columns.find((c) =>
    TIMESTAMP_NAME_PATTERNS.some((pattern) => pattern.test(c.name)),
  );
  return byName?.name;
};

export const getTypeAcronym = (type: string): string => {
  switch (type) {
    case 'bool':
      return 'BOOL';
    case 'integer':
      return 'INT';
    case 'double':
      return 'DBL';
    case 'timestamp':
      return 'TMSTP';
    case 'string':
      return 'STR';
    default:
      return 'STR';
  }
};
