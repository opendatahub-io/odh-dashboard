import type { Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';
import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any tab extension point.
 */
export type DetailTabProperties = {
  /** A unique identifier for this tab. */
  id: string;
  /** The display title for the tab. */
  title: string;
  /** The component to render as tab content. */
  component: ComponentCodeRef;
  /** Identifies which page/surface this tab belongs to. */
  group?: string;
  /** Optional label badge displayed alongside the tab title. */
  label?: string;
};

/**
 * Generic extension point for tabs on any detail page.
 *
 * Contributors set `group` to target a specific page (e.g. `'model-registry.details'`).
 * Consumers filter by `group` via the `ExtensibleDetailTabs` component or manually.
 *
 * @example
 * ```ts
 * const extension: DetailTabExtension = {
 *   type: 'core.detail/tab',
 *   properties: {
 *     id: 'deployments',
 *     title: 'Deployments',
 *     group: 'model-registry.details',
 *     component: () => import('./DeploymentsTab'),
 *   },
 * };
 * ```
 */
export type DetailTabExtension = Extension<'core.detail/tab', DetailTabProperties>;
export const isDetailTabExtension = createExtensionGuard<DetailTabExtension>('core.detail/tab');
