import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/internal/k8sTypes';

/**
 * Adds a navigation item to the host application.
 */
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
     * The react-router path pattern to match against the current location.
     * If not supplied, the `href` is used to match against current location.
     *
     * A successful match will highlight the item as active.
     */
    path?: string;
  }
>;

/**
 * Adds a navigation section to the host application.
 */
export type NavSectionExtension = Extension<'app.navigation/section', NavItemProperties>;

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
  /** Icon for this item. */
  icon?: string;
  /** Label for this item. */
  label?: string;
};

// Type guards

export const isHrefNavItemExtension = (e: Extension): e is HrefNavItemExtension =>
  e.type === 'app.navigation/href';
export const isNavSectionExtension = (e: Extension): e is NavSectionExtension =>
  e.type === 'app.navigation/section';
export const isNavExtension = (e: Extension): e is NavExtension =>
  isHrefNavItemExtension(e) || isNavSectionExtension(e);
