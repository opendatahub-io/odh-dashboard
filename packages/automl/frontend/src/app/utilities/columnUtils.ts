import type { ColumnSchema } from '~/app/hooks/queries';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';

export const getColumnConstraintTooltip = (
  taskType: ConfigureSchema['task_type'],
  selectedColumn: ColumnSchema | undefined,
): string | undefined => {
  if (!selectedColumn) {
    return undefined;
  }

  const isStringColumn = selectedColumn.type === 'string';

  switch (taskType) {
    case TASK_TYPE_TIMESERIES:
      return isStringColumn
        ? 'Time series forecasting requires a numerical target column'
        : undefined;
    case TASK_TYPE_BINARY:
      return selectedColumn.values == null || selectedColumn.values.length > 2
        ? 'Binary classification requires a target column with at most 2 distinct values'
        : undefined;
    case TASK_TYPE_REGRESSION:
      return isStringColumn ? 'Regression requires a numerical target column' : undefined;
    default:
      return undefined;
  }
};

const TIMESTAMP_NAME_PATTERNS = [
  /^timestamp$/i,
  /^datetime$/i,
  /^date[_-]?time$/i,
  /^time[_-]?stamp$/i,
  /^date$/i,
  /^time$/i,
  /^dt$/i,
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
