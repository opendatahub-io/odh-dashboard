import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '../core/types';

/**
 * Adds a task group to the Task Assistant.
 *
 * Groups with zero visible task items (all feature-flagged off) are automatically hidden.
 */
export type TaskGroupExtension = Extension<'app.task/group', TaskGroupProperties>;

export type TaskGroupProperties = {
  /** A unique identifier for this task group. */
  id: string;
  /** The display name of the task group. */
  title: string;
  /** A longer explanation of what this group covers. */
  description: string;
  /** A concise summary of the group, suitable for compact representations. */
  label: string;
  /** Icon representing this task group. */
  icon: ComponentCodeRef;
  /** Color theme identifier for the group's visual style. */
  type: 'set-up' | 'organize' | 'training' | 'serving' | 'general';
  /** Lexicographic sort key for ordering groups. */
  order: string;
};

/**
 * Adds a task item to a task group in the Task Assistant.
 *
 * Tasks with a `tabRoutePageId` destination are automatically hidden when the
 * referenced tab-route page has no contributed tabs.
 */
export type TaskItemExtension = Extension<'app.task/item', TaskItemProperties>;

/**
 * Specifies how to navigate to the task destination.
 *
 * - `href`: A direct navigation path.
 * - `tabRoutePageId`: The `id` of a `TabRoutePageExtension`. The task is only
 *   visible when the referenced page has at least one contributed tab. The `href`
 *   is resolved from the tab-route page's `href` property.
 *
 * Exactly one of `href` or `tabRoutePageId` must be provided, not both.
 */
export type TaskItemDestination =
  | { href: string; tabRoutePageId?: never }
  | { href?: never; tabRoutePageId: string };

export type TaskItemProperties = {
  /** A unique identifier for this task item. */
  id: string;
  /** The `id` of the parent `app.task/group` this task belongs to. */
  group: string;
  /** The display name of the task. */
  title: string;
  /** The navigation target for this task. */
  destination: TaskItemDestination;
  /** Lexicographic sort key for ordering items within the parent group. */
  order: string;
};

export const isTaskGroupExtension = (e: Extension): e is TaskGroupExtension =>
  e.type === 'app.task/group';

export const isTaskItemExtension = (e: Extension): e is TaskItemExtension =>
  e.type === 'app.task/item';
