// Strips package-registered nav extensions so the distribution can replace
// them with flat top-level items (see extensions.ts). Ideally PluginStore
// would support override semantics (register with the same ID to replace),
// which would eliminate this filter entirely.
import type { Extension } from '@openshift/dynamic-plugin-sdk';

const NAV_TYPES = new Set(['app.navigation/section', 'app.navigation/href']);

const NAV_IDS_TO_REMOVE = new Set([
  // Gen-ai nav section and items (replaced by flat nav in extensions.ts)
  'gen-ai-studio',
  'chat-playground',
  'ai-assets',
]);

export const applyExtensionOverrides = (
  extensions: Record<string, Extension[]>,
): Record<string, Extension[]> =>
  Object.fromEntries(
    Object.entries(extensions).map(([name, exts]) => [
      name,
      exts.filter((e) => {
        if (!NAV_TYPES.has(e.type)) {
          return true;
        }
        const { id } = e.properties;
        return !(typeof id === 'string' && NAV_IDS_TO_REMOVE.has(id));
      }),
    ]),
  );
