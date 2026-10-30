import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';

declare global {
  interface Window {
    __MAAS_CONSUMER_PORTAL_GRID__?: boolean;
  }
}

const DEV_FEATURE_FLAGS_PARAM = 'devFeatureFlags';
const DEV_FEATURE_FLAGS_SESSION_KEY = 'odh-maas-portal-feature-flags';
// TODO: Remove this placeholder when mod-arch-core supports a namespace-free grid setup.
export const GRID_MANDATORY_NAMESPACE = '__maas_grid__';

export const isMaaSConsumerPortal = (): boolean =>
  typeof window !== 'undefined' && window.__MAAS_CONSUMER_PORTAL_GRID__ === true;

const parseGridFlagValue = (value: string): boolean => value === 'true';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const readGridFromQuery = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const param = new URLSearchParams(window.location.search).get(DEV_FEATURE_FLAGS_PARAM);
  if (!param) {
    return false;
  }
  if (param === 'true' || param === 'false') {
    return param === 'true';
  }
  return param.split(',').some((flag) => {
    const [name, value] = flag.split('=');
    return name === 'grid' && parseGridFlagValue(value);
  });
};

export const isGridFeatureFlagEnabledFromDevStorage = (): boolean => {
  if (isMaaSConsumerPortal()) {
    return true;
  }
  if (readGridFromQuery()) {
    return true;
  }
  try {
    const rawFlags = window.sessionStorage.getItem(DEV_FEATURE_FLAGS_SESSION_KEY);
    if (!rawFlags) {
      return false;
    }
    const flags: unknown = JSON.parse(rawFlags);
    return isRecord(flags) && flags.grid === true;
  } catch {
    return false;
  }
};

export const useGridFeatureFlag = (): boolean => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  if (typeof window !== 'undefined' && typeof window.__MAAS_CONSUMER_PORTAL_GRID__ === 'boolean') {
    return window.__MAAS_CONSUMER_PORTAL_GRID__;
  }
  const isDashboardGridEnabled =
    dashboardConfig === null ? false : dashboardConfig.dashboardConfig.grid === true;
  return isDashboardGridEnabled || isGridFeatureFlagEnabledFromDevStorage();
};
