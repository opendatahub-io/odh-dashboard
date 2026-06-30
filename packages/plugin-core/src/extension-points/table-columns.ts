import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any table-column extension point.
 *
 * @example
 * ```ts
 * type MyTableColumnExtension = Extension<
 *   'my-package.table/column',
 *   TableColumnProperties
 * >;
 * ```
 */
export type TableColumnProperties = {
  /** The component to render as the column cell content. */
  component: ComponentCodeRef;
};
