import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Returns `true` when `id` contains only URL-safe literal characters
 * (`A-Z`, `a-z`, `0-9`, `_`, `-`) and is therefore safe to use as a
 * React Router `<Route path>` segment without altering matching semantics.
 */
export const isValidExtensionId = (id: string): boolean => SAFE_PATH_SEGMENT.test(id);

export const sortExtensionsByGroup = <T extends { properties: { group?: string } }>(
  extensions: readonly T[],
  defaultGroup = '',
): T[] =>
  extensions.toSorted((a, b) => {
    const groupA = a.properties.group ?? defaultGroup;
    const groupB = b.properties.group ?? defaultGroup;
    return groupA.localeCompare(groupB);
  });

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
 *
 * // With runtime properties validation:
 * export const isFooExtension = createExtensionGuard<FooExtension>(
 *   'namespace.foo/bar',
 *   (p): p is FooProperties => typeof p.id === 'string' && typeof p.title === 'string',
 * );
 * ```
 *
 * @param type - The extension type string to match.
 * @param propertiesValidator - Optional runtime validator for `e.properties`.
 *   When omitted the guard still verifies that `properties` is a non-null object.
 * @returns A type-guard (predicate) function compatible with `useExtensions` / `useResolvedExtensions`.
 */
export const createExtensionGuard = <TExtension extends Extension>(
  type: string,
  propertiesValidator?: (properties: unknown) => properties is TExtension['properties'],
): ExtensionPredicate<TExtension> => {
  const guard = (e: Extension): e is TExtension => {
    if (e.type !== type) {
      return false;
    }
    const props: unknown = e.properties;
    if (typeof props !== 'object' || props == null) {
      return false;
    }
    if (propertiesValidator && !propertiesValidator(props)) {
      return false;
    }
    return true;
  };
  return guard;
};
