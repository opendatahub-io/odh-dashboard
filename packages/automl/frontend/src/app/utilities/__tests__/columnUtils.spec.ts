/* eslint-disable camelcase -- ColumnSchema.task_type matches BFF API response field name */
import {
  findTimestampColumn,
  getColumnConstraintTooltip,
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

  it('should not match partial name patterns', () => {
    const columns = [
      { name: 'my_timestamp_col', type: 'string' },
      { name: 'timestamps', type: 'string' },
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

describe('getColumnConstraintTooltip', () => {
  it('should return undefined when no column is selected', () => {
    expect(getColumnConstraintTooltip('binary', undefined)).toBeUndefined();
  });

  it('should return undefined for multiclass regardless of column', () => {
    expect(
      getColumnConstraintTooltip('multiclass', {
        name: 'col',
        type: 'string',
        task_type: 'multiclass',
      }),
    ).toBeUndefined();
  });

  describe('timeseries', () => {
    it('should reject string columns', () => {
      expect(
        getColumnConstraintTooltip('timeseries', {
          name: 'col',
          type: 'string',
          task_type: 'regression',
        }),
      ).toBe('Time series forecasting requires a numerical target column');
    });

    it('should accept numeric columns', () => {
      expect(
        getColumnConstraintTooltip('timeseries', {
          name: 'col',
          type: 'double',
          task_type: 'regression',
        }),
      ).toBeUndefined();
    });
  });

  describe('binary', () => {
    it('should reject columns with more than 2 values', () => {
      expect(
        getColumnConstraintTooltip('binary', {
          name: 'col',
          type: 'string',
          task_type: 'binary',
          values: ['a', 'b', 'c'],
        }),
      ).toBe('Binary classification requires a target column with at most 2 distinct values');
    });

    it('should reject columns with no values array', () => {
      expect(
        getColumnConstraintTooltip('binary', { name: 'col', type: 'string', task_type: 'binary' }),
      ).toBe('Binary classification requires a target column with at most 2 distinct values');
    });

    it('should accept columns with exactly 2 values', () => {
      expect(
        getColumnConstraintTooltip('binary', {
          name: 'col',
          type: 'string',
          task_type: 'binary',
          values: ['yes', 'no'],
        }),
      ).toBeUndefined();
    });
  });

  describe('regression', () => {
    it('should reject string columns', () => {
      expect(
        getColumnConstraintTooltip('regression', {
          name: 'col',
          type: 'string',
          task_type: 'regression',
        }),
      ).toBe('Regression requires a numerical target column');
    });

    it('should accept numeric columns', () => {
      expect(
        getColumnConstraintTooltip('regression', {
          name: 'col',
          type: 'integer',
          task_type: 'regression',
        }),
      ).toBeUndefined();
    });
  });
});
