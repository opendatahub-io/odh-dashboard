import type { Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';
import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any detail-card extension point.
 */
export type DetailCardProperties = {
  /** The component to render as the detail card content. */
  component: ComponentCodeRef;
  /** Identifies which page/surface this card belongs to. */
  group?: string;
};

/**
 * Generic extension point for detail cards on any detail page.
 *
 * Contributors set `group` to target a specific page
 * (e.g. `'model-registry.model-details'`).
 */
export type DetailCardExtension = Extension<'core.detail-card', DetailCardProperties>;
export const isDetailCardExtension = createExtensionGuard<DetailCardExtension>('core.detail-card');
