/* eslint-disable camelcase -- API schema field names */
import type { ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';
import { compareDatasetColumns } from '~/app/utilities/datasetSplit';

const column = (
  name: string,
  type: ColumnSchema['type'],
  rest: Partial<ColumnSchema> = {},
): ColumnSchema => ({
  name,
  type,
  task_type: 'binary',
  ...rest,
});

describe('compareDatasetColumns', () => {
  it('should compare columns by name and treat integer and decimal samples as numbers', () => {
    expect(
      compareDatasetColumns(
        [column('a', 'integer'), column('b', 'string')],
        [column('b', 'string'), column('a', 'double')],
      ).map(({ status }) => status),
    ).toEqual(['match', 'match']);
  });
  it('should distinguish missing columns, duplicate headers, and mismatched types', () => {
    expect(
      compareDatasetColumns(
        [
          column('missingTest', 'string'),
          column('type', 'double'),
          column('duplicate', 'string'),
          column('duplicate', 'string'),
        ],
        [
          column('missingTraining', 'string'),
          column('type', 'string'),
          column('duplicate', 'string'),
        ],
      ).map(({ name, status }) => ({ name, status })),
    ).toEqual([
      { name: 'missingTest', status: 'missing-test' },
      { name: 'type', status: 'type-mismatch' },
      { name: 'duplicate', status: 'duplicate-name' },
      { name: 'missingTraining', status: 'missing-training' },
    ]);
  });
  it('should keep numeric binary samples compatible with numbers without accepting textual booleans', () => {
    expect(
      compareDatasetColumns([column('a', 'bool', { values: [0, 1] })], [column('a', 'double')])[0]
        .status,
    ).toBe('match');
    expect(
      compareDatasetColumns(
        [column('a', 'bool', { values: ['true', 'false'] })],
        [column('a', 'double')],
      )[0].status,
    ).toBe('type-mismatch');
  });
  it('should report uncertainty when a column has no non-empty sampled values', () => {
    expect(
      compareDatasetColumns([column('a', 'bool', { unique_count: 0 })], [column('a', 'double')])[0]
        .status,
    ).toBe('unknown');
  });
});
