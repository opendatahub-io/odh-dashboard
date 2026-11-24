import type { ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';
import type { AutomlModelInputField } from '~/app/hooks/modelSchema';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { BackTestingData, FeatureImportanceData, TaskType } from '~/app/types';
import { TASK_TYPE_TIMESERIES } from '~/app/utilities/const';

/** Role a column plays when scoring the model. */
export type ModelSchemaRole =
  | 'Feature'
  | 'Known covariate'
  | 'Past covariate'
  | 'ID column'
  | 'Timestamp column'
  | 'Target history';

export type ModelSchemaRow = {
  name: string;
  /** Inferred data type from the training CSV; undefined when the column is not in the CSV. */
  dtype: ColumnSchema['type'] | undefined;
  role: ModelSchemaRole;
  /** False when AutoGluon did not use the column (detected via feature importance when available). */
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
 * - Target column: excluded for tabular models — it is the value being predicted, not a
 *   column the caller sends in for a prediction. For timeseries models the target's
 *   historical values are required input (the serving runtime validates their presence),
 *   so the target is listed with the `Target history` role.
 * - Feature importance: when available, its keys are the set of columns AutoGluon actually
 *   used; columns absent from it are still listed but marked `isUsed: false` ("Not used by
 *   this model"). This applies to timeseries as well — every input column is shown so the
 *   caller knows the full schema, with unused ones flagged. The timeseries id, timestamp,
 *   and target columns are structurally required by the serving runtime and are never
 *   flagged. On the CSV fallback path only, importance keys not in the CSV
 *   (engineered/renamed features) are appended with an unknown dtype — the input schema,
 *   when present, already reflects the serving contract so nothing is appended.
 * - Timeseries: the ID and timestamp columns are required inputs alongside covariates.
 *   Known covariates (user-designated at configure time) are distinguished from past
 *   covariates.
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

  // Feature importance keys are the post-AutoGluon feature set — used to flag columns
  // AutoGluon dropped as "not used" (all input columns remain listed).
  const usedFeatures = featureImportance
    ? new Set(Object.keys(featureImportance.importance))
    : undefined;

  const idColumn = isTimeseries ? (backTesting?.id_column ?? parameters?.id_column) : undefined;
  const timestampColumn = isTimeseries
    ? (backTesting?.timestamp_column ?? parameters?.timestamp_column)
    : undefined;
  const knownCovariates = isTimeseries ? (parameters?.known_covariates_names ?? []) : [];

  // Base entries: column name, dtype, and order — from the input schema when present,
  // otherwise from the training CSV schema. The target is excluded for tabular models
  // (it is the value being predicted, not a column to send in). For timeseries models the
  // target's historical values ARE required input: the serving runtime
  // (kserve-autogluon-server) rejects prediction requests whose instances are missing the
  // target column — the forecast continues the target's history.
  const fields = inputSchema ?? [];
  const useInputSchema = fields.length > 0;
  const entries: { name: string; dtype: ModelSchemaRow['dtype'] }[] = useInputSchema
    ? fields
        .filter((field) => !target || isTimeseries || field.name !== target)
        .map((field) => ({
          name: field.name,
          dtype: normalizeInferenceDatatype(field.datatype),
        }))
    : columns
        .filter((column) => !target || isTimeseries || column.name !== target)
        .map((column) => ({ name: column.name, dtype: column.type }));

  // CSV-fallback only: features present in the importance data but absent from the
  // CSV schema (e.g. engineered features) still need to be sent — with an unknown dtype.
  // Skipped on the input-schema path, where the schema is the authoritative serving
  // contract and already lists everything to send.
  if (usedFeatures && !useInputSchema) {
    const csvNames = new Set(columns.map((column) => column.name));
    for (const name of usedFeatures) {
      if (!csvNames.has(name) && name !== target) {
        entries.push({ name, dtype: undefined });
      }
    }
  }

  const rows: ModelSchemaRow[] = entries.map(({ name, dtype }) => {
    let role: ModelSchemaRole = 'Feature';
    if (isTimeseries) {
      role = 'Past covariate';
      if (name === idColumn) {
        role = 'ID column';
      } else if (name === timestampColumn) {
        role = 'Timestamp column';
      } else if (name === target) {
        role = 'Target history';
      } else if (knownCovariates.includes(name)) {
        role = 'Known covariate';
      }
    }
    // The id, timestamp, and target columns are structurally required by the timeseries
    // serving runtime regardless of which features AutoGluon used — never flag them as
    // "not used".
    const isStructurallyRequired =
      isTimeseries && (name === target || name === idColumn || name === timestampColumn);
    return {
      name,
      dtype,
      role,
      isUsed: usedFeatures ? isStructurallyRequired || usedFeatures.has(name) : true,
      position: 0,
    };
  });

  // Assign 1-based positions in input order (rows above use a placeholder;
  // every row gets its final position here).
  return rows.map((row, index) => ({ ...row, position: index + 1 }));
};

/**
 * Build a scoring sample payload from the model schema rows, in input order
 * (Order 1, 2, 3…). Placeholders use the row's normalized dtype so the vocabulary
 * matches the Model schema tab exactly (e.g. `double`, never model.json's `number`).
 *
 * - Tabular: a single `instances` entry keyed by column name with array-valued type
 *   placeholders (e.g. `["<integer>"]`) — the same shape as model.json's
 *   `inference.sample_payload`.
 * - Timeseries: the serving runtime (kserve-autogluon-server) expects `instances` to be
 *   history rows with scalar values — one row per timestamp carrying the id, timestamp,
 *   and target columns plus past covariates — and, when the model uses known covariates,
 *   a separate top-level `known_covariates` array of future rows carrying the id,
 *   timestamp, and known covariate columns.
 */
export const buildSamplePayload = (
  rows: ModelSchemaRow[],
  isTimeseries = false,
): {
  instances: Record<string, string | string[]>[];
  known_covariates?: Record<string, string>[];
} => {
  // Null prototype: a column named `__proto__` would otherwise invoke the inherited
  // prototype setter instead of creating an own property, dropping it from the template.
  const placeholder = (row: ModelSchemaRow): string => `<${row.dtype ?? 'unknown'}>`;
  if (!isTimeseries) {
    const instance: Record<string, string[]> = Object.create(null);
    for (const row of rows) {
      instance[row.name] = [placeholder(row)];
    }
    return { instances: [instance] };
  }

  // Timeseries history row: id, timestamp, target, past covariates — scalar values.
  const historyRow: Record<string, string> = Object.create(null);
  // Known-covariates row: id, timestamp, and the known covariate columns — scalar values.
  const knownRow: Record<string, string> = Object.create(null);
  for (const row of rows) {
    if (row.role === 'ID column' || row.role === 'Timestamp column') {
      historyRow[row.name] = placeholder(row);
      knownRow[row.name] = placeholder(row);
    } else if (row.role === 'Known covariate') {
      knownRow[row.name] = placeholder(row);
    } else {
      historyRow[row.name] = placeholder(row);
    }
  }
  const hasKnownCovariates = rows.some((row) => row.role === 'Known covariate');
  return hasKnownCovariates
    ? // eslint-disable-next-line camelcase -- key matches the serving request body
      { instances: [historyRow], known_covariates: [knownRow] }
    : { instances: [historyRow] };
};

/**
 * Pretty-print a sample payload with each key:value pair on a single line — unlike
 * `JSON.stringify(payload, null, 2)`, which splits the placeholder arrays across three
 * lines per column and becomes very tall for wide schemas.
 */
export const formatSamplePayloadJson = (payload: ReturnType<typeof buildSamplePayload>): string => {
  const formatRow = (row: Record<string, unknown>): string => {
    const entries = Object.entries(row);
    if (entries.length === 0) {
      return '{}';
    }
    return `{\n${entries
      .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
      .join(',\n')}\n    }`;
  };
  if (payload.instances.length === 0 || Object.keys(payload.instances[0]).length === 0) {
    return '{\n  "instances": [\n    {}\n  ]\n}';
  }
  let json = `{\n  "instances": [\n    ${formatRow(payload.instances[0])}\n  ]`;
  if (payload.known_covariates) {
    json += `,\n  "known_covariates": [\n    ${formatRow(payload.known_covariates[0])}\n  ]`;
  }
  return `${json}\n}`;
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
