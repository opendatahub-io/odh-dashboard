/* eslint-disable camelcase -- mock data uses snake_case keys */
import type { ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';
import type { AutomlModelInputField } from '~/app/hooks/modelSchema';
import type { BackTestingData, FeatureImportanceData } from '~/app/types';
import {
  buildModelSchema,
  buildSamplePayload,
  formatColumnType,
  formatSamplePayloadJson,
  getTargetColumn,
  normalizeInferenceDatatype,
  type ModelSchemaRow,
} from '~/app/utilities/modelSchemaUtils';

const csvColumns = (names: [string, ColumnSchema['type']][]): ColumnSchema[] =>
  names.map(([name, type]) => ({
    name,
    type,
    task_type: 'regression',
    unique_count: 10,
    values: [],
  }));

const tabularParameters = {
  task_type: 'regression' as const,
  label_column: 'col2',
  train_data_secret_name: 'secret',
  train_data_bucket_name: 'bucket',
  train_data_file_key: 'data.csv',
};

const timeseriesParameters = {
  task_type: 'timeseries' as const,
  target: 'sales',
  id_column: 'store_id',
  timestamp_column: 'date',
  known_covariates_names: ['promotion'],
  train_data_secret_name: 'secret',
  train_data_bucket_name: 'bucket',
  train_data_file_key: 'data.csv',
};

describe('getTargetColumn', () => {
  it('should resolve label_column for tabular task types', () => {
    expect(getTargetColumn('regression', tabularParameters)).toBe('col2');
  });

  it('should fall back to target for tabular task types', () => {
    expect(getTargetColumn('binary', { target: 'y' })).toBe('y');
  });

  it('should prefer back_testing target for timeseries, falling back to parameters', () => {
    const backTesting = { target: 'units_sold' } as BackTestingData;
    expect(getTargetColumn('timeseries', timeseriesParameters, backTesting)).toBe('units_sold');
    expect(getTargetColumn('timeseries', timeseriesParameters)).toBe('sales');
  });

  it('should return undefined when no target is configured', () => {
    expect(getTargetColumn('regression')).toBeUndefined();
  });
});

describe('buildModelSchema', () => {
  it('should exclude the target column and list remaining columns as features (tabular)', () => {
    const rows = buildModelSchema(
      csvColumns([
        ['col1', 'string'],
        ['col2', 'double'],
        ['col3', 'integer'],
      ]),
      'regression',
      tabularParameters,
    );

    expect(rows).toEqual([
      { name: 'col1', dtype: 'string', role: 'Feature', isUsed: true, position: 1 },
      { name: 'col3', dtype: 'integer', role: 'Feature', isUsed: true, position: 2 },
    ]);
  });

  it('should mark columns missing from feature importance as not used (tabular)', () => {
    const featureImportance: FeatureImportanceData = {
      importance: { col1: 0.6, col3: 0.4 },
    };
    const rows = buildModelSchema(
      csvColumns([
        ['col1', 'string'],
        ['col2', 'double'],
        ['col3', 'integer'],
        ['col4', 'bool'],
      ]),
      'regression',
      tabularParameters,
      featureImportance,
    );

    expect(rows).toEqual([
      { name: 'col1', dtype: 'string', role: 'Feature', isUsed: true, position: 1 },
      { name: 'col3', dtype: 'integer', role: 'Feature', isUsed: true, position: 2 },
      { name: 'col4', dtype: 'bool', role: 'Feature', isUsed: false, position: 3 },
    ]);
  });

  it('should append engineered features absent from the CSV with unknown dtype (tabular)', () => {
    const featureImportance: FeatureImportanceData = {
      importance: { col1: 0.6, col1_engineered: 0.4 },
    };
    const rows = buildModelSchema(
      csvColumns([
        ['col1', 'string'],
        ['col2', 'double'],
      ]),
      'regression',
      tabularParameters,
      featureImportance,
    );

    expect(rows).toEqual([
      { name: 'col1', dtype: 'string', role: 'Feature', isUsed: true, position: 1 },
      {
        name: 'col1_engineered',
        dtype: undefined,
        role: 'Feature',
        isUsed: true,
        // Engineered features continue numbering after the CSV columns
        position: 2,
      },
    ]);
  });

  it('should flag timeseries columns AutoGluon did not use as not used, still listing them', () => {
    const featureImportance: FeatureImportanceData = {
      importance: { store_id: 0.6, temperature: 0.4 },
    };
    const rows = buildModelSchema(
      csvColumns([
        ['store_id', 'string'],
        ['date', 'timestamp'],
        ['sales', 'double'],
        ['promotion', 'bool'],
        ['temperature', 'double'],
      ]),
      'timeseries',
      timeseriesParameters,
      featureImportance,
    );

    // All input columns are listed for timeseries scoring; importance data only flags
    // which ones AutoGluon actually used. The target (sales) is excluded.
    expect(rows.map((row) => [row.name, row.role, row.isUsed])).toEqual([
      ['store_id', 'ID column', true],
      ['date', 'Timestamp column', false],
      ['promotion', 'Known covariate', false],
      ['temperature', 'Past covariate', true],
    ]);
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
  });

  it('should prefer back_testing id/timestamp columns over parameters (timeseries)', () => {
    const backTesting = {
      target: 'sales',
      id_column: 'item',
      timestamp_column: 'ts',
    } as BackTestingData;
    const rows = buildModelSchema(
      csvColumns([
        ['store_id', 'string'],
        ['item', 'string'],
        ['ts', 'timestamp'],
        ['sales', 'double'],
      ]),
      'timeseries',
      timeseriesParameters,
      undefined,
      backTesting,
    );

    expect(rows.map((row) => [row.name, row.role])).toEqual([
      ['store_id', 'Past covariate'],
      ['item', 'ID column'],
      ['ts', 'Timestamp column'],
    ]);
  });

  it('should return empty array for empty columns', () => {
    expect(buildModelSchema([], 'regression', tabularParameters)).toEqual([]);
  });

  it('should keep all non-target columns when parameters are missing', () => {
    const rows = buildModelSchema(
      csvColumns([
        ['a', 'string'],
        ['b', 'integer'],
      ]),
      'binary',
    );

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.isUsed)).toBe(true);
  });

  describe('with inference input_data_schema fields (model.json)', () => {
    const inputFields: AutomlModelInputField[] = [
      { name: 'col1', datatype: 'string', role: 'feature', required: true },
      { name: 'col2', datatype: 'number', role: 'feature', required: true },
      { name: 'col3', datatype: 'integer', role: 'feature', required: true },
    ];

    it('should use input schema fields for names, dtypes, and order, ignoring CSV columns', () => {
      const rows = buildModelSchema(
        csvColumns([
          ['csv_only', 'bool'],
          ['col3', 'bool'],
        ]),
        'regression',
        tabularParameters,
        undefined,
        undefined,
        inputFields,
      );

      // col2 is the label column (target) — excluded even though the input schema lists it:
      // the caller does not send in the value being predicted.
      expect(rows).toEqual([
        { name: 'col1', dtype: 'string', role: 'Feature', isUsed: true, position: 1 },
        { name: 'col3', dtype: 'integer', role: 'Feature', isUsed: true, position: 2 },
      ]);
    });

    it('should mark fields missing from feature importance as not used', () => {
      const featureImportance: FeatureImportanceData = { importance: { col1: 0.6, col3: 0.4 } };
      const rows = buildModelSchema(
        [],
        'regression',
        tabularParameters,
        featureImportance,
        undefined,
        inputFields,
      );

      expect(rows.map((row) => [row.name, row.isUsed])).toEqual([
        ['col1', true],
        ['col3', true],
      ]);
    });

    it('should not append engineered features absent from the input schema', () => {
      const featureImportance: FeatureImportanceData = {
        importance: { col1: 0.6, col1_engineered: 0.4 },
      };
      const rows = buildModelSchema(
        [],
        'regression',
        tabularParameters,
        featureImportance,
        undefined,
        inputFields,
      );

      // The input schema is the authoritative serving contract — importance-only
      // features are not appended on this path. col2 is the target and is excluded.
      expect(rows.map((row) => row.name)).toEqual(['col1', 'col3']);
    });

    it('should still derive timeseries roles by column name', () => {
      const rows = buildModelSchema([], 'timeseries', timeseriesParameters, undefined, undefined, [
        { name: 'store_id', datatype: 'string' },
        { name: 'date', datatype: 'timestamp' },
        { name: 'sales', datatype: 'number' },
        { name: 'promotion', datatype: 'boolean' },
      ]);

      // sales is the target — excluded even when the input schema lists it.
      expect(rows.map((row) => [row.name, row.dtype, row.role])).toEqual([
        ['store_id', 'string', 'ID column'],
        ['date', 'timestamp', 'Timestamp column'],
        ['promotion', 'bool', 'Known covariate'],
      ]);
    });
  });
});

describe('normalizeInferenceDatatype', () => {
  it('should map inference datatypes to the CSV-schema vocabulary', () => {
    expect(normalizeInferenceDatatype('integer')).toBe('integer');
    expect(normalizeInferenceDatatype('number')).toBe('double');
    expect(normalizeInferenceDatatype('double')).toBe('double');
    expect(normalizeInferenceDatatype('float')).toBe('double');
    expect(normalizeInferenceDatatype('string')).toBe('string');
    expect(normalizeInferenceDatatype('bool')).toBe('bool');
    expect(normalizeInferenceDatatype('boolean')).toBe('bool');
    expect(normalizeInferenceDatatype('timestamp')).toBe('timestamp');
    expect(normalizeInferenceDatatype('datetime')).toBe('timestamp');
  });

  it('should return undefined for unrecognized or missing datatypes', () => {
    expect(normalizeInferenceDatatype('tensor')).toBeUndefined();
    expect(normalizeInferenceDatatype(undefined)).toBeUndefined();
  });
});

describe('buildSamplePayload', () => {
  const rows: ModelSchemaRow[] = [
    { name: 'bedrooms', dtype: 'integer', role: 'Feature', isUsed: true, position: 1 },
    { name: 'sqft', dtype: 'double', role: 'Feature', isUsed: true, position: 2 },
    { name: 'location', dtype: 'string', role: 'Feature', isUsed: true, position: 3 },
  ];

  it('should build a single instance keyed by column name in row order', () => {
    expect(buildSamplePayload(rows)).toEqual({
      instances: [
        {
          bedrooms: ['<integer>'],
          sqft: ['<double>'],
          location: ['<string>'],
        },
      ],
    });
  });

  it('should use the normalized dtype vocabulary, matching the Model schema tab', () => {
    // rows above carry dtype 'double' (normalized from model.json's 'number') — the
    // placeholder must say double, not number, to stay consistent with the schema table.
    expect(buildSamplePayload(rows).instances[0].sqft).toEqual(['<double>']);
  });

  it('should use unknown placeholders for missing dtypes', () => {
    const rowWithoutDtype: ModelSchemaRow[] = [
      { name: 'engineered', dtype: undefined, role: 'Feature', isUsed: true, position: 1 },
    ];
    expect(buildSamplePayload(rowWithoutDtype)).toEqual({
      instances: [{ engineered: ['<unknown>'] }],
    });
  });

  it('should return an empty instance list for no rows', () => {
    expect(buildSamplePayload([])).toEqual({ instances: [{}] });
  });

  it('should include a column named __proto__ as an own property', () => {
    // A plain object would invoke the inherited prototype setter and silently drop
    // the column from the copyable prediction template.
    const protoRows: ModelSchemaRow[] = [
      { name: '__proto__', dtype: 'string', role: 'Feature', isUsed: true, position: 1 },
      { name: 'col1', dtype: 'integer', role: 'Feature', isUsed: true, position: 2 },
    ];
    const payload = buildSamplePayload(protoRows);
    expect(Object.keys(payload.instances[0])).toEqual(['__proto__', 'col1']);
    expect(formatSamplePayloadJson(payload)).toContain('"__proto__": ["<string>"]');
  });
});

describe('formatSamplePayloadJson', () => {
  it('should put each key:value pair on a single line', () => {
    const json = formatSamplePayloadJson({
      instances: [
        {
          bedrooms: ['<integer>'],
          sqft: ['<number>'],
          location: ['<string>'],
        },
      ],
    });
    expect(json).toBe(
      '{\n  "instances": [\n    {\n' +
        '      "bedrooms": ["<integer>"],\n' +
        '      "sqft": ["<number>"],\n' +
        '      "location": ["<string>"]\n' +
        '    }\n  ]\n}',
    );
  });

  it('should render an empty instance object when there are no rows', () => {
    expect(formatSamplePayloadJson({ instances: [{}] })).toBe(
      '{\n  "instances": [\n    {}\n  ]\n}',
    );
  });

  it('should JSON-escape column names', () => {
    const json = formatSamplePayloadJson({ instances: [{ 'quo"te': ['<string>'] }] });
    expect(json).toContain('"quo\\"te": ["<string>"]');
  });
});

describe('formatColumnType', () => {
  it('should format each known type', () => {
    expect(formatColumnType('integer')).toBe('Integer');
    expect(formatColumnType('double')).toBe('Double');
    expect(formatColumnType('timestamp')).toBe('Timestamp');
    expect(formatColumnType('bool')).toBe('Boolean');
    expect(formatColumnType('string')).toBe('String');
  });

  it('should format unknown types', () => {
    expect(formatColumnType(undefined)).toBe('Unknown');
  });
});
