import * as React from 'react';
import { isEqual } from 'lodash-es';
import { useSearchParams } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isAreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { definedFeatureFlags, SupportedAreasStateMap } from '#~/concepts/areas/const';
import { DashboardCommonConfig, DashboardConfigKind } from '#~/k8sTypes';
import { DevFeatureFlags } from '#~/types';
import axios from '#~/utilities/axios';
import { isDefinedFeatureFlag } from '#~/concepts/areas/utils';

const PARAM_NAME = 'devFeatureFlags';
const SESSION_KEY = 'odh-feature-flags';
const HEADER_NAME = 'x-odh-feature-flags';

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

export const useDevFlags: () => string[] = () => {
  const areaExtensions = useExtensions(isAreaExtension);
  return React.useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...Object.values(SupportedAreasStateMap).map((area) => area.devFlags),
            ...areaExtensions.map((ext) => ext.properties.devFlags),
          ]
            .filter((ff) => ff != null)
            .flat(),
        ),
      ),
    [areaExtensions],
  );
};

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
  const [sessionFlags, setSessionFlags] = useBrowserStorage<Record<string, boolean> | null>(
    SESSION_KEY,
    null,
    true,
    true,
  );

  const [isBannerVisible, setBannerVisible] = useBrowserStorage<boolean>(
    `odh.dashboard.devFlag.banner`,
    false,
  );

  const devFlags = useDevFlags();
  const combinedFlags = React.useMemo(() => [...definedFeatureFlags, ...devFlags], [devFlags]);

  const isFlag = React.useCallback((key: string) => combinedFlags.includes(key), [combinedFlags]);

  // only keep valid feature flags
  const sanitizedSessionFlags = React.useMemo(() => {
    if (sessionFlags) {
      const entries = Object.entries(sessionFlags);

      // return the sanitized object
      const newFlags = entries.reduce<Record<string, boolean>>((acc, [key, v]) => {
        if (isFlag(key) && typeof v === 'boolean') {
          acc[key] = v;
        }
        return acc;
      }, {});

      if (isEqual(newFlags, sessionFlags)) {
        // return the original object to keep stable reference
        return sessionFlags;
      }

      return newFlags;
    }
    return null;
  }, [sessionFlags, isFlag]);

  // read from query string at first then fallback to session
  const firstLoad = React.useRef(true);
  const devFeatureFlags =
    (firstLoad.current
      ? (() => {
          const param = searchParams.get(PARAM_NAME);
          if (param != null) {
            if (param === 'true' || param === 'false') {
              const value = param === 'false';
              return combinedFlags.reduce<Record<string, boolean>>((acc, v) => {
                if (isFlag(v)) {
                  acc[v] = value;
                }
                return acc;
              }, {});
            }
            return param.split(',').reduce<Record<string, boolean>>((acc, v) => {
              const [name, bool] = v.split('=');
              if (isFlag(name)) {
                acc[name] = bool === 'true';
              } else {
                const fullName = `disable${capitalize(name)}`;
                if (isFlag(fullName)) {
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
      setBannerVisible(true);
      setSearchParams(searchParams, { replace: true });
    } else if (searchParams.has(PARAM_NAME)) {
      // clean up query string
      searchParams.delete(PARAM_NAME);
      setBannerVisible(true);
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
      const configFeatureFlags = Object.entries(devFeatureFlags).reduce<
        Partial<DashboardCommonConfig>
      >((acc, [key, value]) => {
        if (isDefinedFeatureFlag(key)) {
          acc[key] = value;
        }
        return acc;
      }, {});

      return {
        ...dashboardConfig,
        spec: {
          ...dashboardConfig.spec,
          dashboardConfig: {
            ...dashboardConfig.spec.dashboardConfig,
            ...configFeatureFlags,
          },
        },
      };
    }
    return dashboardConfig ?? null;
  }, [devFeatureFlags, dashboardConfig]);

  // api functions
  const resetDevFeatureFlags = React.useCallback(
    (turnOff: boolean) => {
      setSessionFlags(turnOff ? null : {});
      setBannerVisible(false);
    },
    [setSessionFlags, setBannerVisible],
  );

  const setDevFeatureFlag = React.useCallback(
    (flag: string, value: boolean) => {
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
    isBannerVisible,
  };
};

export default useDevFeatureFlags;
