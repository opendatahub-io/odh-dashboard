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
