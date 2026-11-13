import type { ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';
import type { AutomlModelInputField } from '~/app/hooks/modelSchema';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { BackTestingData, FeatureImportanceData, TaskType } from '~/app/types';
import { TASK_TYPE_TIMESERIES } from '~/app/utilities/const';

/** Role a column plays when scoring the model. */
export type ModelSchemaRole =
  'Feature' | 'Known covariate' | 'Past covariate' | 'ID column' | 'Timestamp column';

export type ModelSchemaRow = {
  name: string;
  /** Inferred data type from the training CSV; undefined when the column is not in the CSV. */
  dtype: ColumnSchema['type'] | undefined;
  role: ModelSchemaRole;
  /** False when AutoGluon did not use the column (tabular only, detected via feature importance). */
  isUsed: boolean;
  /**
   * 1-based position in training-data column order (the order to use for positional scoring
   * requests). Engineered features absent from the CSV continue the numbering after it.
   */
  position: number;
};

/**
 * Resolve the target (prediction) column for a run. Timeseries runs store it as `target`
 * (also present in back_testing.json); tabular runs store it as `label_column`.
 */
export const getTargetColumn = (
  taskType: TaskType,
  parameters?: Partial<ConfigureSchema>,
  backTesting?: BackTestingData,
): string | undefined =>
  taskType === TASK_TYPE_TIMESERIES
    ? (backTesting?.target ?? parameters?.target)
    : (parameters?.label_column ?? parameters?.target);

/**
 * Map an `inference.input_data_schema` datatype to the CSV-schema type vocabulary used by
 * `ModelSchemaRow.dtype`. Returns undefined for unrecognized values (displayed as Unknown).
 */
export const normalizeInferenceDatatype = (
  datatype: string | undefined,
): ColumnSchema['type'] | undefined => {
  switch (datatype) {
    case 'integer':
      return 'integer';
    case 'number':
    case 'double':
    case 'float':
      return 'double';
    case 'string':
      return 'string';
    case 'bool':
    case 'boolean':
      return 'bool';
    case 'timestamp':
    case 'datetime':
    case 'date':
      return 'timestamp';
    default:
      return undefined;
  }
};

/**
 * Build the model input schema — the columns (and data types) a caller must send the model
 * to get a prediction.
 *
 * Column names, data types, and order come from `inputSchema` (model.json's
 * `inference.input_data_schema`) when present — it is the model's authoritative serving
 * contract. Otherwise they are derived from the training CSV schema and the experiment
 * configuration (legacy model.json files without the inference block).
 *
 * - Tabular: when feature importance is available, its keys are the authoritative feature
 *   set: columns not present were dropped by AutoGluon (marked `isUsed: false`). On the CSV
 *   fallback path only, importance keys not in the CSV (engineered/renamed features) are
 *   appended with an unknown dtype — the input schema, when present, already reflects the
 *   serving contract so nothing is appended.
 * - Timeseries: the ID and timestamp columns are required inputs alongside covariates.
 *   Known covariates (user-designated at configure time) are distinguished from past
 *   covariates. Dropped-column detection is not available for timeseries models.
 */
export const buildModelSchema = (
  columns: ColumnSchema[],
  taskType: TaskType,
  parameters?: Partial<ConfigureSchema>,
  featureImportance?: FeatureImportanceData,
  backTesting?: BackTestingData,
  inputSchema?: AutomlModelInputField[],
): ModelSchemaRow[] => {
  const isTimeseries = taskType === TASK_TYPE_TIMESERIES;
  const target = getTargetColumn(taskType, parameters, backTesting);

  // Feature importance keys are the post-AutoGluon feature set (tabular only).
  const usedFeatures =
    !isTimeseries && featureImportance
      ? new Set(Object.keys(featureImportance.importance))
      : undefined;

  const idColumn = isTimeseries ? (backTesting?.id_column ?? parameters?.id_column) : undefined;
  const timestampColumn = isTimeseries
    ? (backTesting?.timestamp_column ?? parameters?.timestamp_column)
    : undefined;
  const knownCovariates = isTimeseries ? (parameters?.known_covariates_names ?? []) : [];

  // Base entries: column name, dtype, and order — from the input schema when present,
  // otherwise from the training CSV schema.
  const fields = inputSchema ?? [];
  const useInputSchema = fields.length > 0;
  const entries: { name: string; dtype: ModelSchemaRow['dtype'] }[] = useInputSchema
    ? fields
        .filter((field) => field.name !== target)
        .map((field) => ({ name: field.name, dtype: normalizeInferenceDatatype(field.datatype) }))
    : columns
        .filter((column) => column.name !== target)
        .map((column) => ({ name: column.name, dtype: column.type }));

  const rows: ModelSchemaRow[] = entries.map(({ name, dtype }) => {
    let role: ModelSchemaRole = 'Feature';
    if (isTimeseries) {
      role = 'Past covariate';
      if (name === idColumn) {
        role = 'ID column';
      } else if (name === timestampColumn) {
        role = 'Timestamp column';
      } else if (knownCovariates.includes(name)) {
        role = 'Known covariate';
      }
    }
    return {
      name,
      dtype,
      role,
      isUsed: usedFeatures ? usedFeatures.has(name) : true,
      position: 0,
    };
  });

  // Tabular CSV-fallback only: features present in the importance data but absent from the
  // CSV schema (e.g. engineered features) still need to be sent — with an unknown dtype.
  // Skipped on the input-schema path, where the schema is the authoritative serving
  // contract and already lists everything to send.
  if (usedFeatures && !useInputSchema) {
    const csvNames = new Set(columns.map((column) => column.name));
    for (const name of usedFeatures) {
      if (!csvNames.has(name) && name !== target) {
        rows.push({
          name,
          dtype: undefined,
          role: 'Feature',
          isUsed: true,
          position: 0,
        });
      }
    }
  }

  // Assign 1-based positions in input order (rows above use a placeholder;
  // every row gets its final position here).
  return rows.map((row, index) => ({ ...row, position: index + 1 }));
};

/**
 * Build a scoring sample payload from the model schema rows: a single `instances` entry
 * keyed by column name, in input order (Order 1, 2, 3…), with each value a type
 * placeholder (e.g. `["<integer>"]`) — the same shape as model.json's
 * `inference.sample_payload`.
 *
 * Placeholders use the row's normalized dtype so the vocabulary matches the Model schema
 * tab exactly (e.g. `double`, never model.json's raw `number`).
 */
export const buildSamplePayload = (
  rows: ModelSchemaRow[],
): { instances: Record<string, string[]>[] } => {
  const instance: Record<string, string[]> = {};
  for (const row of rows) {
    instance[row.name] = [`<${row.dtype ?? 'unknown'}>`];
  }
  return { instances: [instance] };
};

/**
 * Pretty-print a sample payload with each key:value pair on a single line — unlike
 * `JSON.stringify(payload, null, 2)`, which splits the placeholder arrays across three
 * lines per column and becomes very tall for wide schemas.
 */
export const formatSamplePayloadJson = (payload: ReturnType<typeof buildSamplePayload>): string => {
  const entries = Object.entries(payload.instances[0] ?? {});
  if (entries.length === 0) {
    return '{\n  "instances": [\n    {}\n  ]\n}';
  }
  const body = entries
    .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(',\n');
  return `{\n  "instances": [\n    {\n${body}\n    }\n  ]\n}`;
};

/** Human-readable label for a CSV-inferred data type. */
export const formatColumnType = (dtype: ColumnSchema['type'] | undefined): string => {
  switch (dtype) {
    case 'integer':
      return 'Integer';
    case 'double':
      return 'Double';
    case 'timestamp':
      return 'Timestamp';
    case 'bool':
      return 'Boolean';
    case 'string':
      return 'String';
    default:
      return 'Unknown';
  }
};
