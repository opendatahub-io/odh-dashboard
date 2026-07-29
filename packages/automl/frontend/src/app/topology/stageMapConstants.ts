import { MAX_TOP_N_TABULAR, MAX_TOP_N_TIMESERIES } from '~/app/utilities/const';

export const NESTED_STAGE_FIELD_KEYS = ['metadata', 'metrics', 'outputs', 'details'] as const;

/** Alias used when walking nested stage records for field lookup. */
export const NESTED_STAGE_RECORD_KEYS = NESTED_STAGE_FIELD_KEYS;

export const NESTED_STAGE_FIELD_KEY_SET = new Set<string>(NESTED_STAGE_FIELD_KEYS);

export const UNSAFE_FLATTEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const FLATTEN_FIELD_EXCLUDED = new Set([
  'id',
  'description',
  'status',
  'timestamp',
  'steps',
  'selected_models',
  'display_name',
  'name',
  'component_id',
  'started_at',
  'completed_at',
  'pipeline_id',
  'kfp_run_id',
  'published_at',
  ...NESTED_STAGE_FIELD_KEYS,
]);

export function isAllowedFlattenKey(key: string): boolean {
  return !FLATTEN_FIELD_EXCLUDED.has(key) && !UNSAFE_FLATTEN_KEYS.has(key);
}

/** AutoGluon model_selection publishes four branch steps today; cap fan-out expansion. */
export const MAX_MODEL_SELECTION_STEPS = 8;

/** Max 0-based branch-N index; matches configure top_n fan-out (branch-0 … branch-9). */
export const MAX_BRANCH_INDEX = Math.max(MAX_TOP_N_TABULAR, MAX_TOP_N_TIMESERIES) - 1;

const BRANCH_ID_SUFFIX_PATTERN = /^branch-(\d+)$/;

/** Parses `branch-N` suffixes with bounds validation for safe array/map indexing. */
export function parseBranchIndexFromSuffix(branchId: string): number | undefined {
  const match = BRANCH_ID_SUFFIX_PATTERN.exec(branchId);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_BRANCH_INDEX) {
    return undefined;
  }
  return parsed;
}

/** Dedupes string IDs in first-seen order. */
export function dedupePreservingOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    uniqueValues.push(value);
  }
  return uniqueValues;
}

/** Dedupes model_selection steps in first-seen order, then applies the branch step cap. */
export function capModelSelectionSteps(steps: readonly string[]): string[] {
  return dedupePreservingOrder(steps).slice(0, MAX_MODEL_SELECTION_STEPS);
}
