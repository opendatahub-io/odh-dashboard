import type { Extension } from '@openshift/dynamic-plugin-sdk';

export const PATCH_EXTENSION_TYPE = 'app.patch';

/** Allowlisted nav-chrome fields that may appear in an `app.patch` payload. */
export type NavPatch = {
  title?: string;
  group?: string;
  /** Set to `null` to clear `section` (flatten to top level). */
  section?: string | null;
  /** Set to `null` to clear `label`. */
  label?: string | null;
  dataAttributes?: Record<string, string>;
};

/** NavPatch keys that may be set to `null` to clear the property. */
export type ClearableNavPatchKey = {
  [K in keyof Required<NavPatch>]: null extends NavPatch[K] ? K : never;
}[keyof NavPatch];

export type PatchExtension = Extension<
  typeof PATCH_EXTENSION_TYPE,
  {
    targetType: string;
    targetId: string;
    patch: NavPatch;
  }
>;

export const isPatchExtension = (e: Extension): e is PatchExtension =>
  e.type === PATCH_EXTENSION_TYPE;

export const NAV_PATCH_KEYS = [
  'title',
  'group',
  'section',
  'label',
  'dataAttributes',
] as const satisfies readonly (keyof NavPatch)[];

/** Keys that may be `null` to delete the property when applying a patch. */
export const CLEARABLE_NAV_PATCH_KEYS = [
  'section',
  'label',
] as const satisfies readonly ClearableNavPatchKey[];

/** Keys whose values are string records rather than plain strings. */
const OBJECT_NAV_PATCH_KEYS = ['dataAttributes'] as const satisfies readonly (keyof NavPatch)[];

const ALLOWED_NAV_PATCH_KEYS = new Set<string>(NAV_PATCH_KEYS);
const CLEARABLE_NAV_PATCH_KEY_SET = new Set<string>(CLEARABLE_NAV_PATCH_KEYS);
const OBJECT_NAV_PATCH_KEY_SET = new Set<string>(OBJECT_NAV_PATCH_KEYS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isClearableNavPatchKey = (field: string): field is ClearableNavPatchKey =>
  CLEARABLE_NAV_PATCH_KEY_SET.has(field);

const isValidNavPatchField = (field: string, value: unknown): boolean => {
  if (!ALLOWED_NAV_PATCH_KEYS.has(field)) {
    // Unknown keys are ignored at apply time; do not invalidate the whole patch.
    return true;
  }
  if (CLEARABLE_NAV_PATCH_KEY_SET.has(field)) {
    return typeof value === 'string' || value === null;
  }
  if (OBJECT_NAV_PATCH_KEY_SET.has(field)) {
    return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
  }
  return typeof value === 'string';
};

/** Runtime guard for `app.patch` payloads (allowlisted field shapes). */
export const isValidNavPatch = (patch: unknown): patch is NavPatch =>
  isRecord(patch) &&
  Object.entries(patch).every(([field, value]) => isValidNavPatchField(field, value));
