import * as React from 'react';
import { Bullseye, Page, Spinner } from '@patternfly/react-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isAreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import useFetchDscStatus from '#~/concepts/areas/useFetchDscStatus';
import useFetchDsciStatus from '#~/concepts/areas/useFetchDsciStatus';
import {
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '#~/k8sTypes';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { useAppContext } from '#~/app/AppContext';
import {
  IsAreaAvailableStatus,
  SupportedAreaType,
  SupportedComponentFlagValue,
} from '#~/concepts/areas/types';
import { FlagState, getFlags, isAreaAvailable } from '#~/concepts/areas/utils';
import { SupportedAreasStateMap } from '#~/concepts/areas/const';

type AreaContextState = {
  /**
   * If value is `null`:
   *   Using the v1 Operator, no status to pull
   *   TODO: Remove when we no longer want to support v1
   */
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
  areasStatus: Record<SupportedAreaType, IsAreaAvailableStatus | undefined>;
};

export const AreaContext = React.createContext<AreaContextState>({
  dscStatus: null,
  dsciStatus: null,
  areasStatus: {},
});

type InnerProps = {
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
  flags?: FlagState | null;
  children: React.ReactNode;
};

const Inner: React.FC<InnerProps> = ({ dscStatus, dsciStatus, flags, children }) => {
  const { dashboardConfig } = useAppContext();
  const dashboardConfigSpecSafe = useDeepCompareMemoize(dashboardConfig.spec);
  const dscStatusSafe = useDeepCompareMemoize(dscStatus);
  const dsciStatusSafe = useDeepCompareMemoize(dsciStatus);
  const areasExtensions = useExtensions(isAreaExtension);

  const configFlags = React.useMemo(
    () => getFlags(dashboardConfigSpecSafe),
    [dashboardConfigSpecSafe],
  );

  const flagState = React.useMemo(
    () => ({
      ...configFlags,
      ...flags,
    }),
    [configFlags, flags],
  );

  const stateMap = React.useMemo(
    () => ({
      ...SupportedAreasStateMap,
      ...areasExtensions.reduce<Record<string, SupportedComponentFlagValue>>((acc, extension) => {
        acc[extension.properties.id] = extension.properties;
        return acc;
      }, {}),
    }),
    [areasExtensions],
  );

  // track all areas enablement
  const areasStatus = React.useMemo(
    () =>
      Object.keys(stateMap).reduce<Record<SupportedAreaType, IsAreaAvailableStatus>>(
        (acc, area) => {
          acc[area] = isAreaAvailable(
            area,
            dashboardConfigSpecSafe,
            dscStatusSafe,
            dsciStatusSafe,
            {
              internalStateMap: stateMap,
              flagState,
            },
          );
          return acc;
        },
        {},
      ),
    [dashboardConfigSpecSafe, dscStatusSafe, dsciStatusSafe, stateMap, flagState],
  );

  const contextValue = React.useMemo(
    () => ({ dscStatus, dsciStatus, areasStatus }),
    [dscStatus, dsciStatus, areasStatus],
  );

  return <AreaContext.Provider value={contextValue}>{children}</AreaContext.Provider>;
};

type AreaContextProps = {
  flags?: FlagState | null;
  children: React.ReactNode;
};

const AreaContextProvider: React.FC<AreaContextProps> = ({ flags, children }) => {
  const [dscStatus, loadedDsc, errorDsc] = useFetchDscStatus();
  const [dsciStatus, loadedDsci, errorDsci] = useFetchDsciStatus();

  const error = errorDsc || errorDsci;
  const loaded = loadedDsc && loadedDsci;

  if (error || (loaded && (!dscStatus || Object.keys(dscStatus).length === 0))) {
    return (
      <Page>
        <ApplicationsPage loaded empty={false}>
          <RedirectErrorState
            title="Could not load component state"
            errorMessage={error?.message}
          />
        </ApplicationsPage>
      </Page>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <Inner dscStatus={dscStatus} dsciStatus={dsciStatus} flags={flags}>
      {children}
    </Inner>
  );
};
export default AreaContextProvider;
