/* eslint-disable camelcase -- ColumnSchema.task_type matches BFF API response field name */
import {
  findTimestampColumn,
  formatTargetColumnUniqueValuesMessage,
  getTargetColumnUniqueValueCount,
  getTypeAcronym,
} from '~/app/utilities/columnUtils';

describe('findTimestampColumn', () => {
  it('should find a column with type "timestamp"', () => {
    const columns = [
      { name: 'id', type: 'integer' },
      { name: 'created', type: 'timestamp' },
      { name: 'value', type: 'double' },
    ];
    expect(findTimestampColumn(columns)).toBe('created');
  });

  it('should prioritize type match over name match', () => {
    const columns = [
      { name: 'timestamp', type: 'string' },
      { name: 'recorded_at', type: 'timestamp' },
    ];
    expect(findTimestampColumn(columns)).toBe('recorded_at');
  });

  it('should fall back to name pattern when no type match exists', () => {
    const columns = [
      { name: 'id', type: 'integer' },
      { name: 'timestamp', type: 'string' },
      { name: 'value', type: 'double' },
    ];
    expect(findTimestampColumn(columns)).toBe('timestamp');
  });

  it.each([
    'timestamp',
    'Timestamp',
    'TIMESTAMP',
    'datetime',
    'date_time',
    'date-time',
    'time_stamp',
    'time-stamp',
    'date',
    'time',
    'dt',
    'ds',
    'ts',
    'created_at',
    'created-at',
    'updated_at',
    'updated-at',
    'recorded_at',
    'recorded-at',
    'event_time',
    'event-time',
  ])('should match column named "%s" by name pattern', (name) => {
    const columns = [
      { name: 'id', type: 'integer' },
      { name, type: 'string' },
    ];
    expect(findTimestampColumn(columns)).toBe(name);
  });

  it('should return undefined when no columns match', () => {
    const columns = [
      { name: 'id', type: 'integer' },
      { name: 'value', type: 'double' },
      { name: 'label', type: 'string' },
    ];
    expect(findTimestampColumn(columns)).toBeUndefined();
  });

  it('should return undefined for empty columns array', () => {
    expect(findTimestampColumn([])).toBeUndefined();
  });

  it('should match "ds" columns with numeric types (common forecasting datestamp)', () => {
    const columns = [
      { name: 'y', type: 'double' },
      { name: 'ds', type: 'integer' },
    ];
    expect(findTimestampColumn(columns)).toBe('ds');
  });

  it('should not match partial name patterns', () => {
    const columns = [
      { name: 'my_timestamp_col', type: 'string' },
      { name: 'timestamps', type: 'string' },
      { name: 'ids', type: 'integer' },
    ];
    expect(findTimestampColumn(columns)).toBeUndefined();
  });
});

describe('getTypeAcronym', () => {
  it.each([
    ['bool', 'BOOL'],
    ['integer', 'INT'],
    ['double', 'DBL'],
    ['timestamp', 'TMSTP'],
    ['string', 'STR'],
  ])('should return acronym for type "%s" as "%s"', (type, expected) => {
    expect(getTypeAcronym(type)).toBe(expected);
  });

  it('should return "STR" for unknown types', () => {
    expect(getTypeAcronym('unknown')).toBe('STR');
    expect(getTypeAcronym('')).toBe('STR');
  });
});

describe('getTargetColumnUniqueValueCount', () => {
  it('should return unique_count when provided', () => {
    expect(
      getTargetColumnUniqueValueCount({
        name: 'credit_score',
        type: 'integer',
        task_type: 'regression',
        unique_count: 3,
      }),
    ).toBe(3);
  });

  it('should fall back to values length when unique_count is omitted', () => {
    expect(
      getTargetColumnUniqueValueCount({
        name: 'status',
        type: 'string',
        task_type: 'binary',
        values: ['yes', 'no'],
      }),
    ).toBe(2);
  });

  it('should return undefined when column is undefined', () => {
    expect(getTargetColumnUniqueValueCount(undefined)).toBeUndefined();
  });
});

describe('formatTargetColumnUniqueValuesMessage', () => {
  it('should pluralize values for counts other than 1', () => {
    expect(formatTargetColumnUniqueValuesMessage('credit_score', 3)).toBe(
      '3 unique values detected in "credit_score"',
    );
  });

  it('should use singular value for a count of 1', () => {
    expect(formatTargetColumnUniqueValuesMessage('flag', 1)).toBe(
      '1 unique value detected in "flag"',
    );
  });
});
