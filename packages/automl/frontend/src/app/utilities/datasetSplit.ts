import type { ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';

export const DATASET_SPLIT_AUTO = 'auto';
export const DATASET_SPLIT_SEPARATE = 'separate';

export const DATASET_SPLIT_MODES = [DATASET_SPLIT_AUTO, DATASET_SPLIT_SEPARATE] as const;

export type DatasetSplitMode = (typeof DATASET_SPLIT_MODES)[number];

export type ColumnComparison = {
  name: string;
  trainingType: string;
  testType: string;
  status:
    'match' | 'type-mismatch' | 'missing-training' | 'missing-test' | 'duplicate-name' | 'unknown';
};

export const COLUMN_COMPARISON_STATUS: Record<ColumnComparison['status'], string> = {
  match: 'Match',
  'type-mismatch': 'Type mismatch',
  'missing-training': 'Missing in training data',
  'missing-test': 'Missing in test data',
  'duplicate-name': 'Duplicate column name',
  unknown: 'Insufficient sample values',
};

export function formatDatasetColumnType(column?: ColumnSchema): string {
  if (!column) {
    return 'Missing';
  }
  if (column.unique_count === 0) {
    return 'Unknown';
  }
  // Schema inference labels numeric binary values as bool. Keep them compatible with numbers.
  if (
    column.type === 'bool' &&
    column.values?.length &&
    column.values.every((value) => typeof value === 'number')
  ) {
    return 'Number';
  }
  switch (column.type) {
    case 'integer':
    case 'double':
      return 'Number';
    case 'string':
      return 'Text';
    case 'bool':
      return 'Boolean';
    case 'timestamp':
      return 'Date/time';
    default:
      return 'Unknown';
  }
}

/** Match headers by name; column order and integer/decimal samples do not affect compatibility. */
export function compareDatasetColumns(
  training: ColumnSchema[],
  test: ColumnSchema[],
): ColumnComparison[] {
  const trainingByName = new Map(training.map((column) => [column.name, column]));
  const testByName = new Map(test.map((column) => [column.name, column]));
  const duplicateNames = new Set<string>();
  for (const columns of [training, test]) {
    const seen = new Set<string>();
    for (const { name } of columns) {
      if (seen.has(name)) {
        duplicateNames.add(name);
      }
      seen.add(name);
    }
  }
  return [...new Set([...trainingByName.keys(), ...testByName.keys()])].map((name) => {
    const trainingType = formatDatasetColumnType(trainingByName.get(name));
    const testType = formatDatasetColumnType(testByName.get(name));
    let status: ColumnComparison['status'] = 'match';
    if (duplicateNames.has(name)) {
      status = 'duplicate-name';
    } else if (!trainingByName.has(name)) {
      status = 'missing-training';
    } else if (!testByName.has(name)) {
      status = 'missing-test';
    } else if (trainingType === 'Unknown' || testType === 'Unknown') {
      status = 'unknown';
    } else if (trainingType !== testType) {
      status = 'type-mismatch';
    }
    return { name, trainingType, testType, status };
  });
}
