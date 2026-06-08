import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any detail-card extension point.
 *
 * @example
 * ```ts
 * type MyDetailCardExtension = Extension<
 *   'my-package.details/card',
 *   DetailCardProperties
 * >;
 * ```
 */
export type DetailCardProperties = {
  /** The component to render as the detail card content. */
  component: ComponentCodeRef;
};
