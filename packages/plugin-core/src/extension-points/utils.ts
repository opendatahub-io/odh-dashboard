import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';

/**
 * Creates a type-guard function for a given extension type string.
 *
 * Eliminates the repetitive pattern:
 * ```ts
 * export const isFooExtension = (e: Extension): e is FooExtension =>
 *   e.type === 'namespace.foo/bar';
 * ```
 *
 * Usage:
 * ```ts
 * export const isFooExtension = createExtensionGuard<FooExtension>('namespace.foo/bar');
 * ```
 *
 * @param type - The extension type string to match.
 * @returns A type-guard (predicate) function compatible with `useExtensions` / `useResolvedExtensions`.
 */
export const createExtensionGuard = <TExtension extends Extension>(
  type: string,
): ExtensionPredicate<TExtension> => {
  const guard = (e: Extension): e is TExtension => e.type === type;
  return guard;
};
