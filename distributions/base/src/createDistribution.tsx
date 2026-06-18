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
}

const DistributionApp: React.FC<{ config: DistributionConfig }> = ({ config }) => {
  const store = React.useMemo(() => {
    const s = new PluginStore(config.extensions);
    if (config.featureFlags) {
      s.setFeatureFlags(config.featureFlags);
    }
    return s;
  }, [config]);

  return (
    <ThemeProvider>
      <PluginStoreProvider store={store}>
        <Shell masthead={<ShellHeader />} sidebar={<ShellNav />}>
          <ShellRoutes />
        </Shell>
      </PluginStoreProvider>
    </ThemeProvider>
  );
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
