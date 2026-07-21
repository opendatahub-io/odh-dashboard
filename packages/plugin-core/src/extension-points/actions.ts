import type { Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';
import type { ComponentCodeRef } from '../core/types';

/**
 * Reusable base properties for any action extension point
 * (header actions, table row actions, etc.).
 */
export type ActionProperties = {
  /** A unique identifier for this action. */
  id: string;
  /** The display label for the action. */
  label: string;
  /** The component to render for this action. */
  component: ComponentCodeRef;
  /** Identifies which page/surface this action belongs to. */
  group?: string;
};

/**
 * Generic extension point for actions (header dropdowns, table row actions, etc.).
 *
 * Contributors set `group` to target a specific surface
 * (e.g. `'model-registry.registered-models.header'`).
 */
export type ActionExtension = Extension<'core.action', ActionProperties>;
export const isActionExtension = createExtensionGuard<ActionExtension>('core.action');
