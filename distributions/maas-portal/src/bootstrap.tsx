import { createDistribution } from '@odh-dashboard/base-distribution';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import K8sSdkProvider from './providers/K8sSdkProvider';
import PortalContextProvider from './providers/PortalContextProvider';
import { PORTAL_BASE_PATH } from './portalPaths';
import {
  GRID,
  getPortalFeatureFlagOverrides,
  persistPortalFeatureFlagOverrides,
} from './featureFlags';

declare global {
  interface Window {
    __MAAS_CONSUMER_PORTAL_GRID__?: boolean;
  }
}

type DashboardConfigResponse = {
  spec?: { dashboardConfig?: Record<string, unknown> };
};

const isDashboardConfigResponse = (value: unknown): value is DashboardConfigResponse =>
  typeof value === 'object' && value !== null;

const getRuntimeFeatureFlags = async (
  overrides: Record<string, boolean>,
): Promise<Record<string, boolean>> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const headers: HeadersInit = { 'Cache-Control': 'no-cache' };
    if (Object.keys(overrides).length > 0) {
      headers['x-odh-feature-flags'] = JSON.stringify(overrides);
    }
    const response = await fetch(`${PORTAL_BASE_PATH}/api/config`, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      return overrides;
    }
    const config: unknown = await response.json();
    if (!isDashboardConfigResponse(config)) {
      return overrides;
    }
    const dashboardConfig = config.spec?.dashboardConfig;
    const gridValue = dashboardConfig?.[GRID];
    if (typeof gridValue === 'boolean') {
      return { [GRID]: gridValue };
    }

    return overrides;
  } catch {
    return overrides;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const bootstrap = async (): Promise<void> => {
  const portalOverrides = getPortalFeatureFlagOverrides();
  persistPortalFeatureFlagOverrides(portalOverrides);
  const runtimeFeatureFlags = await getRuntimeFeatureFlags(portalOverrides);
  const effectiveGridFlag = runtimeFeatureFlags[GRID] ?? featureFlags[GRID];

  // MaaS is a separately federated package and cannot read the distribution
  // feature-flag store directly. Publish the resolved value before loading
  // the package so its API clients can select the matching BFF base path.
  window.__MAAS_CONSUMER_PORTAL_GRID__ = effectiveGridFlag;

  createDistribution({
    extensions: pluginExtensions,
    featureFlags: { ...featureFlags, ...runtimeFeatureFlags },
    AppWrapper: PortalContextProvider,
    PluginStoreWrapper: K8sSdkProvider,
    basename: PORTAL_BASE_PATH,
  });
};

void bootstrap();
