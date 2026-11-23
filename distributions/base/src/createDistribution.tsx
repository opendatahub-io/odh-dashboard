import './styles/theme-overrides.scss';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, redirect, replace, RouterProvider } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { BrowserStorageContextProvider } from '@odh-dashboard/ui-core/hooks/useBrowserStorage';
import Shell from './Shell';
import ShellHeader from './ShellHeader';
import ShellNav from './ShellNav';
import ShellRoutes from './ShellRoutes';
import { ThemeProvider } from './ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

export interface DistributionConfig {
  extensions: Record<string, Extension[]>;
  featureFlags?: Record<string, boolean>;
  rootElementId?: string;
  /** Optional public base path for a distribution hosted below the gateway root. */
  basename?: string;
  /**
   * Optional path redirects, e.g. `{ '/': '/models' }`. The router applies them while
   * navigating, before rendering, and like an HTTP redirect they never leave the redirected path
   * in the history: Back returns to the page before it. A target must be a page, not another
   * redirect's path: React Router pushes the second hop of a chain. Prefer them to a route
   * extension that renders <Navigate>.
   */
  redirects?: Record<string, string>;
  /**
   * Optional replacement for PluginStoreProvider. Use when a distribution
   * needs to initialize additional SDK state around the same plugin store.
   */
  PluginStoreWrapper?: React.ComponentType<{
    store: PluginStore;
    children: React.ReactNode;
  }>;
  /**
   * Optional host wrapper around the shell (e.g. ProjectsContextProvider).
   * Distributions use this to mount host-only providers without forking the shell.
   */
  AppWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

const DistributionApp: React.FC<{ config: DistributionConfig }> = ({ config }) => {
  const store = React.useMemo(() => {
    const s = new PluginStore(config.extensions);
    if (config.featureFlags) {
      s.setFeatureFlags(config.featureFlags);
    }
    return s;
  }, [config]);

  const { AppWrapper, PluginStoreWrapper } = config;

  const shellContent = (
    <Shell masthead={<ShellHeader />} sidebar={<ShellNav />}>
      <ShellRoutes />
    </Shell>
  );

  const appContent = AppWrapper ? <AppWrapper>{shellContent}</AppWrapper> : shellContent;
  const storeContent = PluginStoreWrapper ? (
    <PluginStoreWrapper store={store}>{appContent}</PluginStoreWrapper>
  ) : (
    <PluginStoreProvider store={store}>{appContent}</PluginStoreProvider>
  );

  return (
    <ThemeProvider>
      <BrowserStorageContextProvider>{storeContent}</BrowserStorageContextProvider>
    </ThemeProvider>
  );
};

/**
 * A loader that redirects to `to` the way an HTTP redirect does.
 *
 * On a page load, or on Back and Forward, the browser already shows the redirected URL in its
 * own history entry, so replace() swaps that entry for `to`. A link click is different: React
 * Router runs the new route's loaders before it adds the link's URL to the history, so the
 * current entry is still the page the link was clicked from; replace() would overwrite that page,
 * and redirect() adds `to` after it instead. (A navigation made with `replace: true` still
 * replaces, because redirect() keeps it.) See
 * https://github.com/remix-run/react-router/issues/14481.
 */
const redirectTo =
  (to: string) =>
  ({ request }: LoaderFunctionArgs): Response => {
    const { pathname, search } = new URL(request.url);
    const isCurrentEntry =
      pathname === window.location.pathname && search === window.location.search;
    return isCurrentEntry ? replace(to) : redirect(to);
  };

export function createDistribution(config: DistributionConfig): void {
  const rootElementId = config.rootElementId ?? 'root';
  const container = document.getElementById(rootElementId);
  if (!container) {
    throw new Error(`Root element #${rootElementId} not found`);
  }

  const router = createBrowserRouter(
    [
      ...Object.entries(config.redirects ?? {}).map(([path, to]) => ({
        path,
        loader: redirectTo(to),
      })),
      {
        path: '*',
        element: <DistributionApp config={config} />,
      },
    ],
    { basename: config.basename },
  );

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
