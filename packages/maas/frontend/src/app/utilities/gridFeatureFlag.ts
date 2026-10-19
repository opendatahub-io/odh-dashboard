import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { MAAS_ORGS_CLAIM, type MaaSMe } from '~/app/types/me';

declare global {
  interface Window {
    __MAAS_CONSUMER_PORTAL_GRID__?: boolean;
  }
}

const DEV_FEATURE_FLAGS_PARAM = 'devFeatureFlags';
const DEV_FEATURE_FLAGS_SESSION_KEY = 'odh-maas-portal-feature-flags';
// TODO: Remove this placeholder when mod-arch-core supports a namespace-free grid setup.
export const GRID_MANDATORY_NAMESPACE = '__maas_grid__';

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
  if (typeof window !== 'undefined' && window.__MAAS_CONSUMER_PORTAL_GRID__ === true) {
    return true;
  }
  if (readGridFromQuery()) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
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
  const isDashboardGridEnabled =
    dashboardConfig === null ? false : dashboardConfig.dashboardConfig.grid === true;
  const isPortalGridEnabled =
    typeof window === 'undefined' ? false : window.__MAAS_CONSUMER_PORTAL_GRID__ === true;
  return isDashboardGridEnabled || isPortalGridEnabled || isGridFeatureFlagEnabledFromDevStorage();
};

export const getMaaSMeDisplayName = (me: MaaSMe): string => me.name || me.email || me.sub;

export const isMaaSMeAdmin = (me: MaaSMe): boolean =>
  me[MAAS_ORGS_CLAIM].some((org) => org.roles.includes('admins'));
