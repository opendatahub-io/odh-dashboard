import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { SUPPRESS_EXTENSION_TYPE } from '../extension-points/suppress';
import {
  PATCH_EXTENSION_TYPE,
  NAV_PATCH_KEYS,
  isClearableNavPatchKey,
  isValidNavPatch,
  type NavPatch,
} from '../extension-points/patch';

const ALLOWED_PATCH_KEYS = new Set<string>(NAV_PATCH_KEYS);

const isDevBuild = (): boolean => process.env.NODE_ENV !== 'production';

const warnDev = (message: string): void => {
  if (!isDevBuild()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(message);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isValidSuppressProps = (
  properties: LoadedExtension['properties'],
): properties is { targetType: string; targetId: string } =>
  isRecord(properties) &&
  isNonEmptyString(properties.targetType) &&
  isNonEmptyString(properties.targetId);

const isValidPatchProps = (
  properties: LoadedExtension['properties'],
): properties is { targetType: string; targetId: string; patch: NavPatch } =>
  isRecord(properties) &&
  isNonEmptyString(properties.targetType) &&
  isNonEmptyString(properties.targetId) &&
  isValidNavPatch(properties.patch);

export type StoredPatch = {
  patch: NavPatch;
  pluginName: string;
};

/** Collision-free identity key for `(type, id)`. */
export const extensionKey = (type: string, id: string): string => JSON.stringify([type, id]);

const getExtensionId = (ext: LoadedExtension): string | undefined => {
  const { id } = ext.properties;
  return typeof id === 'string' ? id : undefined;
};

/**
 * Collect `app.patch` payloads (last whole patch wins per target) and drop them
 * from the extension list. Patches always apply regardless of the patch extension's flags.
 */
export const extractPatches = (
  raw: LoadedExtension[],
): { extensions: LoadedExtension[]; patches: Map<string, StoredPatch> } => {
  const extensions: LoadedExtension[] = [];
  const patches = new Map<string, StoredPatch>();

  for (const ext of raw) {
    if (ext.type !== PATCH_EXTENSION_TYPE) {
      extensions.push(ext);
      continue;
    }

    if (!isValidPatchProps(ext.properties)) {
      warnDev(
        `[PluginStore] Invalid patch extension from plugin "${ext.pluginName}": targetType, targetId, and patch object are required`,
      );
      continue;
    }

    const { targetType, targetId, patch } = ext.properties;
    patches.set(extensionKey(targetType, targetId), {
      patch,
      pluginName: ext.pluginName,
    });
  }

  return { extensions, patches };
};

/**
 * Resolve `app.suppress` tombstones.
 *
 * For each `(targetType, targetId)`, only registrations that appear *before* the
 * last matching suppress in catalog order are removed. Registrations after that
 * suppress survive, so distributions can suppress a package extension and redefine
 * the same `(type, id)`.
 */
export const applySuppress = (raw: LoadedExtension[]): LoadedExtension[] => {
  const lastSuppressIndex = new Map<string, number>();

  raw.forEach((ext, index) => {
    if (ext.type !== SUPPRESS_EXTENSION_TYPE) {
      return;
    }

    if (!isValidSuppressProps(ext.properties)) {
      warnDev(
        `[PluginStore] Invalid suppress extension from plugin "${ext.pluginName}": targetType and targetId must be non-empty strings`,
      );
      return;
    }

    const { targetType, targetId } = ext.properties;
    warnDev(
      `[PluginStore] Extension (${targetType}, ${targetId}) suppressed by plugin "${ext.pluginName}"`,
    );
    lastSuppressIndex.set(extensionKey(targetType, targetId), index);
  });

  const result: LoadedExtension[] = [];
  const seenIds = new Map<string, string>(); // key -> latest pluginName (collision warnings)

  raw.forEach((ext, index) => {
    if (ext.type === SUPPRESS_EXTENSION_TYPE) {
      return;
    }

    const id = getExtensionId(ext);
    if (id !== undefined) {
      const key = extensionKey(ext.type, id);
      const suppressAt = lastSuppressIndex.get(key);
      if (suppressAt !== undefined && index < suppressAt) {
        return;
      }

      const previousPlugin = seenIds.get(key);
      if (previousPlugin !== undefined) {
        warnDev(
          `[PluginStore] Duplicate extension (${ext.type}, ${id}) registered by plugin "${ext.pluginName}" (previously by "${previousPlugin}"). Catalog stays additive — suppress the old entry before redefining, or use app.patch for chrome-only changes.`,
        );
      }
      seenIds.set(key, ext.pluginName);
    }

    result.push(ext);
  });

  return result;
};

/**
 * Apply collected `app.patch` payloads to in-use extensions with a matching `(type, id)`.
 * Only allowlisted nav-chrome keys are applied; unknown keys are ignored (dev warn).
 */
export const applyPatches = (
  exts: LoadedExtension[],
  patches: Map<string, StoredPatch>,
): LoadedExtension[] => {
  if (patches.size === 0) {
    return exts;
  }

  const applied = new Set<string>();

  const patched = exts.map((ext) => {
    const id = getExtensionId(ext);
    if (id === undefined) {
      return ext;
    }

    const key = extensionKey(ext.type, id);
    const stored = patches.get(key);
    if (!stored) {
      return ext;
    }

    applied.add(key);
    const nextProperties = { ...ext.properties };

    Object.entries(stored.patch).forEach(([field, value]) => {
      if (!ALLOWED_PATCH_KEYS.has(field)) {
        warnDev(
          `[PluginStore] Ignoring non-allowlisted patch key "${field}" for (${ext.type}, ${id}) from plugin "${stored.pluginName}"`,
        );
        return;
      }

      if (value === null && isClearableNavPatchKey(field)) {
        delete nextProperties[field];
        return;
      }

      nextProperties[field] = value;
    });

    return {
      ...ext,
      properties: nextProperties,
    };
  });

  patches.forEach((stored, key) => {
    if (!applied.has(key)) {
      warnDev(
        `[PluginStore] Patch from plugin "${stored.pluginName}" for "${key}" had no matching in-use extension`,
      );
    }
  });

  return patched;
};
