import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any action extension point
 * (header actions, table row actions, etc.).
 *
 * @example
 * ```ts
 * type MyActionExtension = Extension<
 *   'my-package.header/action',
 *   ActionProperties & { customField?: boolean }
 * >;
 * ```
 */
export type ActionProperties = {
  /** A unique identifier for this action. */
  id: string;
  /** The display label for the action. */
  label: string;
  /** The component to render for this action. */
  component: ComponentCodeRef;
  /** Group used to sort actions lexicographically. */
  group?: string;
};
