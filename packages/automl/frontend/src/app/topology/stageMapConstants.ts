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
