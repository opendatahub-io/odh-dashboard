import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/internal/k8sTypes';

export type HrefNavItemExtension = Extension<
  'app.navigation/href',
  NavItemProperties & {
    /** The link href value. */
    href: string;
    /** The access review resource attributes for this item. */
    accessReview?: AccessReviewResourceAttributes;
    /** The status provider ID for this item. */
    statusProviderId?: string;
    /**
     * The path pattern to match against the URL to determine if this link matches the current route.
     *
     * If not supplied, the `href` is used as an exact match to the current route.
     */
    pathMatch?: string;
  }
>;

export type NavSectionExtension = Extension<
  'app.navigation/section',
  Omit<NavItemProperties, 'section'>
>;

export type NavExtension = HrefNavItemExtension | NavSectionExtension;

export type NavItemProperties = {
  /** A unique identifier for this item. */
  id: string;
  /** The title of this item. */
  title: string;
  /** Navigation section to which this item belongs to. If not specified, render this item at the top level. */
  section?: string;
  /** Adds data attributes to the DOM. */
  dataAttributes?: { [key: string]: string };
  /** Group are used to sort items lexographically. Unspecified items will be sorted into the '5_default' group. */
  group?: string;
};

// Type guards

export const isHrefNavItemExtension = (e: Extension): e is HrefNavItemExtension =>
  e.type === 'app.navigation/href';
export const isNavSectionExtension = (e: Extension): e is NavSectionExtension =>
  e.type === 'app.navigation/section';
export const isNavExtension = (e: Extension): e is NavExtension =>
  isHrefNavItemExtension(e) || isNavSectionExtension(e);
