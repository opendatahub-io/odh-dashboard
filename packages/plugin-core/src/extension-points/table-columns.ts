import type { Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';
import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any table-column extension point.
 */
export type TableColumnProperties = {
  /** The component to render as the column cell content. */
  component: ComponentCodeRef;
  /** Identifies which table/surface this column belongs to. */
  group?: string;
};

/**
 * Generic extension point for table columns.
 *
 * Contributors set `group` to target a specific table
 * (e.g. `'model-registry.registered-models'`).
 */
export type TableColumnExtension = Extension<'core.table-column', TableColumnProperties>;
export const isTableColumnExtension =
  createExtensionGuard<TableColumnExtension>('core.table-column');
