import { isRecord } from './utils';
import type { ClearableKey, PatchFieldSchema } from '../extension-points/patch';

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
export type ClearableNavPatchKey = ClearableKey<NavPatch>;

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

const DATA_ATTRIBUTE_KEY = /^data-[a-z0-9-]+$/;

export const isClearableNavPatchKey = (field: string): field is ClearableNavPatchKey =>
  CLEARABLE_NAV_PATCH_KEY_SET.has(field);

const isValidNavPatchField = (field: string, value: unknown): boolean => {
  if (!ALLOWED_NAV_PATCH_KEYS.has(field)) {
    return true;
  }
  if (CLEARABLE_NAV_PATCH_KEY_SET.has(field)) {
    return typeof value === 'string' || value === null;
  }
  if (OBJECT_NAV_PATCH_KEY_SET.has(field)) {
    return (
      isRecord(value) &&
      Object.entries(value).every(([k, v]) => typeof v === 'string' && DATA_ATTRIBUTE_KEY.test(k))
    );
  }
  return typeof value === 'string';
};

/** Runtime guard for `app.patch` payloads (allowlisted field shapes). */
export const isValidNavPatch = (patch: unknown): patch is NavPatch =>
  isRecord(patch) &&
  Object.entries(patch).every(([field, value]) => isValidNavPatchField(field, value));

export const NAV_PATCH_SCHEMA: PatchFieldSchema = {
  isValid: isValidNavPatch,
  allowedKeys: ALLOWED_NAV_PATCH_KEYS,
  isClearableKey: isClearableNavPatchKey,
};
