import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/internal/k8sTypes';
import type { NavItemProperties } from './navigation';
import type { ComponentCodeRef } from '../core/types';

/**
 * Defines a tabbed page that appears as a navigation item.
 *
 * Individual tabs are contributed via `TabRouteTabExtension` extensions
 * that reference this page's `id` via their `pageId` property.
 *
 * Smart rendering based on tab count:
 * - 0 tabs: page is not rendered, nav item is hidden
 * - 1 tab: page renders the single tab's content without a tab bar
 * - 2+ tabs: page renders a full tab bar with all tabs
 */
export type TabRoutePageExtension = Extension<
  'app.tab-route/page',
  NavItemProperties & {
    /** The link href value for the nav item. */
    href: string;
    /**
     * The react-router path pattern to match against the current location.
     * Should include a wildcard suffix (e.g. '/ai-hub/models/*') to capture tab sub-paths.
     */
    path: string;
    /** The access review resource attributes for this item. */
    accessReview?: AccessReviewResourceAttributes;
    /**
     * Object type string for the page title icon (e.g. 'registered-models').
     * Used with TitleWithIcon to render a page-level title above the tabs.
     */
    objectType?: string;
  }
>;

/**
 * Adds a tab to a tabbed page defined by `TabRoutePageExtension`.
 *
 * The tab's `id` is used as the URL sub-path segment (e.g. 'catalog' → '/ai-hub/models/catalog').
 * Tab selection is URL-driven, supporting browser back/forward navigation.
 */
export type TabRouteTabExtension = Extension<
  'app.tab-route/tab',
  {
    /** The `id` of the parent `TabRoutePageExtension` this tab belongs to. */
    pageId: string;
    /** A unique identifier for this tab, also used as the URL sub-path segment. */
    id: string;
    /** The display title for the tab. */
    title: string;
    /** The component to render as tab content. */
    component: ComponentCodeRef;
    /** Group used to sort tabs lexicographically. Unspecified tabs will be sorted into the '5_default' group. */
    group?: string;
  }
>;

export type TabRouteExtension = TabRoutePageExtension | TabRouteTabExtension;

// Type guards

export const isTabRoutePageExtension = (e: Extension): e is TabRoutePageExtension =>
  e.type === 'app.tab-route/page';
export const isTabRouteTabExtension = (e: Extension): e is TabRouteTabExtension =>
  e.type === 'app.tab-route/tab';
export const isTabRouteExtension = (e: Extension): e is TabRouteExtension =>
  isTabRoutePageExtension(e) || isTabRouteTabExtension(e);
