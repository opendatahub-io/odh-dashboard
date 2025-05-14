import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBrowserStorage } from '~/components/browserStorage/BrowserStorageContext';
import { allFeatureFlags } from '~/concepts/areas/const';
import { isFeatureFlag } from '~/concepts/areas/utils';
import { DashboardCommonConfig, DashboardConfigKind } from '~/k8sTypes';
import { DevFeatureFlags } from '~/types';
import axios from '~/utilities/axios';

const PARAM_NAME = 'devFeatureFlags';
const SESSION_KEY = 'odh-feature-flags';
const HEADER_NAME = 'x-odh-feature-flags';

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/**
 * Override dashboard config feature flags in the query string: eg.
 * `devFeatureFlags=disableHome=false,appLauncher,support=true`
 * Results in:
 *  - disableHome = false
 *  - disableAppLauncher = false
 *  - disableSupport = false
 *
 * Use `?devFeatureFlags=true` to enable all feature flags and `?devFeatureFlags=false` to disable all feature flags.
 */
const useDevFeatureFlags = (
  dashboardConfig?: DashboardConfigKind | null,
): {
  dashboardConfig: DashboardConfigKind | null;
} & DevFeatureFlags => {
  const [isDevFeatureFlagQueryVisible, setDevFeatureFlagQueryVisible] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionFlags, setSessionFlags] = useBrowserStorage<Partial<DashboardCommonConfig> | null>(
    SESSION_KEY,
    null,
    true,
    true,
  );

  // only keep valid feature flags
  const sanitizedSessionFlags = React.useMemo<Partial<DashboardCommonConfig> | null>(() => {
    if (sessionFlags) {
      const entries = Object.entries(sessionFlags);
      const filteredEntries = entries.filter(
        ([key, value]) => isFeatureFlag(key) && typeof value === 'boolean',
      );
      if (entries.length === filteredEntries.length) {
        // return the original object if valid
        // keep stable reference
        return sessionFlags;
      }
      // return the sanitized object
      return filteredEntries.reduce<Partial<DashboardCommonConfig>>((acc, [key, v]) => {
        if (isFeatureFlag(key)) {
          acc[key] = v;
        }
        return acc;
      }, {});
    }
    return null;
  }, [sessionFlags]);

  // read from query string at first then fallback to session
  const firstLoad = React.useRef(true);
  const devFeatureFlags =
    (firstLoad.current
      ? (() => {
          const devFlagsParam = searchParams.get(PARAM_NAME);
          if (devFlagsParam != null) {
            if (devFlagsParam === 'true' || devFlagsParam === 'false') {
              const value = devFlagsParam === 'false';
              return allFeatureFlags.reduce<Partial<DashboardCommonConfig>>((acc, v) => {
                if (isFeatureFlag(v)) {
                  acc[v] = value;
                }
                return acc;
              }, {});
            }
            return devFlagsParam.split(',').reduce<Partial<DashboardCommonConfig>>((acc, v) => {
              const [name, bool] = v.split('=');
              if (isFeatureFlag(name)) {
                acc[name] = bool === 'true';
              } else {
                const fullName = `disable${capitalize(name)}`;
                if (isFeatureFlag(fullName)) {
                  acc[fullName] = bool === 'false';
                }
              }
              return acc;
            }, {});
          }
          return null;
        })()
      : null) ?? sanitizedSessionFlags;
  firstLoad.current = false;

  React.useEffect(() => {
    if (isDevFeatureFlagQueryVisible) {
      searchParams.set(
        PARAM_NAME,
        devFeatureFlags
          ? Object.entries(devFeatureFlags)
              .map(([key, value]) => `${key}=${value}`)
              .join(',')
          : '',
      );
      setSearchParams(searchParams, { replace: true });
    } else if (searchParams.has(PARAM_NAME)) {
      // clean up query string
      searchParams.delete(PARAM_NAME);
      setSearchParams(searchParams, { replace: true });
    }
    // do not react to changes in searchParams or setSearchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDevFeatureFlagQueryVisible, devFeatureFlags]);

  // update session
  React.useEffect(() => {
    // assign axios default header
    if (devFeatureFlags) {
      axios.defaults.headers.common[HEADER_NAME] = JSON.stringify(devFeatureFlags);
    } else {
      delete axios.defaults.headers.common[HEADER_NAME];
    }

    // update session storage
    // compares against original sessionFlags object on purpose and not the sanitizedSessionFlags
    if (devFeatureFlags !== sessionFlags) {
      setSessionFlags(devFeatureFlags);
    }
  }, [devFeatureFlags, sessionFlags, setSessionFlags]);

  // construct the new dashbaord config by merging in the dev feature flags
  const newDashboardConfig = React.useMemo<DashboardConfigKind | null>(() => {
    if (dashboardConfig && devFeatureFlags) {
      return {
        ...dashboardConfig,
        spec: {
          ...dashboardConfig.spec,
          dashboardConfig: {
            ...dashboardConfig.spec.dashboardConfig,
            ...devFeatureFlags,
          },
        },
      };
    }
    return dashboardConfig ?? null;
  }, [devFeatureFlags, dashboardConfig]);

  // api functions
  const resetDevFeatureFlags = React.useCallback(() => {
    setDevFeatureFlagQueryVisible(false);
    setSessionFlags(null);
  }, [setSessionFlags]);

  const setDevFeatureFlag = React.useCallback(
    (flag: keyof DashboardCommonConfig, value: boolean) => {
      setSessionFlags({ ...sessionFlags, [flag]: value });
    },
    [sessionFlags, setSessionFlags],
  );

  return {
    dashboardConfig: newDashboardConfig,
    devFeatureFlags,
    setDevFeatureFlag,
    resetDevFeatureFlags,
    setDevFeatureFlagQueryVisible,
  };
};

export default useDevFeatureFlags;
