import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
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

  const { AppWrapper } = config;

  const app = (
    <ThemeProvider>
      <PluginStoreProvider store={store}>
        <Shell masthead={<ShellHeader />} sidebar={<ShellNav />}>
          <ShellRoutes />
        </Shell>
      </PluginStoreProvider>
    </ThemeProvider>
  );

  return AppWrapper ? <AppWrapper>{app}</AppWrapper> : app;
};

export function createDistribution(config: DistributionConfig): void {
  const rootElementId = config.rootElementId ?? 'root';
  const container = document.getElementById(rootElementId);
  if (!container) {
    throw new Error(`Root element #${rootElementId} not found`);
  }

  const router = createBrowserRouter([
    {
      path: '*',
      element: <DistributionApp config={config} />,
    },
  ]);

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
