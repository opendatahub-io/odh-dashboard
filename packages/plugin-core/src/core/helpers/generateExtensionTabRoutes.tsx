import * as React from 'react';
import { Route } from 'react-router-dom';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { DetailTabProperties } from '../../extension-points/detail-tabs';
import { isValidExtensionId } from '../../extension-points/utils';

type GenerateExtensionTabRoutesOptions<TExtension extends Extension<string, DetailTabProperties>> =
  {
    /** Loaded tab extensions (from `useExtensions`). */
    tabExtensions: LoadedExtension<TExtension>[];
    /**
     * A React element to render as the route content for each tab.
     * Receives the extension's `id` as the `tab` prop and `empty` set to `false`.
     */
    renderElement: (tabId: string) => React.ReactElement;
  };

/**
 * Generates `<Route>` elements for tab extensions.
 *
 * Each route uses the extension's `id` as the URL path segment.
 * IDs containing route-significant characters (`:`, `*`, `/`) are
 * skipped to prevent unintended React Router matching semantics.
 * The `renderElement` callback controls what is rendered for each tab route.
 *
 * This replaces bespoke route generators like `DetailsTabExtensionRoutes.tsx`
 * and `VersionDetailsTabExtensionRoutes.tsx` with a single generic utility.
 *
 * @example
 * ```tsx
 * <Routes>
 *   <Route path="overview" element={<OverviewPage />} />
 *   {generateExtensionTabRoutes({
 *     tabExtensions,
 *     renderElement: (tabId) => <DetailsPage tab={tabId} empty={false} />,
 *   })}
 * </Routes>
 * ```
 */
export const generateExtensionTabRoutes = <
  TExtension extends Extension<string, DetailTabProperties>,
>({
  tabExtensions,
  renderElement,
}: GenerateExtensionTabRoutesOptions<TExtension>): React.ReactElement[] =>
  tabExtensions
    .filter((extension) => isValidExtensionId(extension.properties.id))
    .map((extension) => (
      <Route
        key={extension.properties.id}
        path={extension.properties.id}
        element={renderElement(extension.properties.id)}
      />
    ));
