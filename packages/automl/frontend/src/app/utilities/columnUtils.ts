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
