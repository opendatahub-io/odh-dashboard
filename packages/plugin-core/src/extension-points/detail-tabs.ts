import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any tab extension point.
 *
 * Packages define their own tab extensions by intersecting these properties
 * with any extra fields specific to their domain.
 *
 * @example
 * ```ts
 * type MyDetailsTabExtension = Extension<
 *   'my-package.details/tab',
 *   DetailTabProperties & { extraProp?: string }
 * >;
 * ```
 */
export type DetailTabProperties = {
  /** A unique identifier for this tab. */
  id: string;
  /** The display title for the tab. */
  title: string;
  /** The component to render as tab content. */
  component: ComponentCodeRef;
  /** Group used to sort tabs lexicographically. Unspecified tabs are placed in `'5_default'`. */
  group?: string;
  /** Optional label badge displayed alongside the tab title. */
  label?: string;
};
