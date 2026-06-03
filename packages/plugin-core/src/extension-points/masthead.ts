/**
 * @module masthead
 *
 * Masthead extension points for the app-shell chrome (brand, toolbar, user menu, about modal).
 *
 * Current consumer: `distributions/base` (RHAII app-shell).
 * Convergence with the RHOAI dashboard masthead is a future goal — these types are intentionally
 * designed to be compatible with that direction but are not yet consumed by `frontend/`.
 */

import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '../core/types';

/**
 * Provides branding for the host application masthead.
 */
export type MastheadBrandExtension = Extension<
  'app.masthead/brand',
  {
    /** The component to render as the brand logo. */
    logoComponent: ComponentCodeRef;
    /** Alt text for the brand logo. */
    logoAlt: string;
    /** Optional link href for the brand. Defaults to '/'. */
    href?: string;
  }
>;

/**
 * Adds a toolbar item to the host application masthead.
 */
export type MastheadToolbarItemExtension = Extension<
  'app.masthead/toolbar-item',
  {
    /** A unique identifier for this toolbar item. */
    id: string;
    /** The component to render in the toolbar. */
    component: ComponentCodeRef;
    /** Group used for lexicographic sorting of toolbar items. */
    group?: string;
  }
>;

/**
 * Provides user identity and menu for the host application masthead.
 *
 * The shell owns the dropdown structure and assembles these pieces.
 * Unlike fully plugin-driven controls, the shell controls layout,
 * loading state, and consistent positioning (e.g. logout is always last).
 */
export type MastheadUserMenuExtension = Extension<
  'app.masthead/user-menu',
  {
    /** Component that renders the current user's display name. */
    usernameRef: ComponentCodeRef;
    /** Component that renders the logout action (button, link, or redirect trigger). */
    logoutRef: ComponentCodeRef;
    /** Optional component that renders additional menu items (profile, preferences). */
    menuItemsRef?: ComponentCodeRef;
  }
>;

/**
 * Provides about/help modal content for the host application masthead.
 *
 * The rendered component receives `onClose` — it MUST call it to dismiss the modal.
 */
export type MastheadAboutExtension = Extension<
  'app.masthead/about',
  {
    /** The component to render inside the about/help modal. Receives { onClose: () => void }. */
    component: ComponentCodeRef<{ onClose: () => void }>;
  }
>;

export type MastheadExtension =
  | MastheadBrandExtension
  | MastheadToolbarItemExtension
  | MastheadUserMenuExtension
  | MastheadAboutExtension;

// Type guards

export const isMastheadBrandExtension = (e: Extension): e is MastheadBrandExtension =>
  e.type === 'app.masthead/brand';

export const isMastheadToolbarItemExtension = (e: Extension): e is MastheadToolbarItemExtension =>
  e.type === 'app.masthead/toolbar-item';

export const isMastheadUserMenuExtension = (e: Extension): e is MastheadUserMenuExtension =>
  e.type === 'app.masthead/user-menu';

export const isMastheadAboutExtension = (e: Extension): e is MastheadAboutExtension =>
  e.type === 'app.masthead/about';

export const isMastheadExtension = (e: Extension): e is MastheadExtension =>
  isMastheadBrandExtension(e) ||
  isMastheadToolbarItemExtension(e) ||
  isMastheadUserMenuExtension(e) ||
  isMastheadAboutExtension(e);
