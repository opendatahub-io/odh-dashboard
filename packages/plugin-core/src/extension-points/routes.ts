import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '../core/types';

/**
 * Adds a route to the host application.
 */
export type RouteExtension = Extension<
  'app.route',
  {
    /** The component to render for this route. */
    component: ComponentCodeRef;
    /** The react-router path pattern to match against the current location. */
    path: string;
    /** The react-router path pattern corresponding to the v2 path for backward compatibility. */
    v2PathRedirect?: string;
  }
>;

// Type guards

export const isRouteExtension = (e: Extension): e is RouteExtension => e.type === 'app.route';
