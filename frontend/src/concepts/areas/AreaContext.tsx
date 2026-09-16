import * as React from 'react';
import { Bullseye, Page, Spinner } from '@patternfly/react-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  AreaContext,
  type IsAreaAvailableStatus,
  type SupportedAreaType,
  type SupportedComponentFlagValue,
} from '@odh-dashboard/plugin-core/areas';
import { isAreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import type {
  AIHubKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '@odh-dashboard/k8s-core';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import useFetchDscStatus from '#~/concepts/areas/useFetchDscStatus';
import useFetchDsciStatus from '#~/concepts/areas/useFetchDsciStatus';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { useAppContext } from '#~/app/AppContext';
import { FlagState, getFlags, isAreaAvailable } from '#~/concepts/areas/utils';
import { SupportedAreasStateMap } from '#~/concepts/areas/const';
import useFetchAIHub from '#~/concepts/areas/useFetchAIHub';

export { AreaContext } from '@odh-dashboard/plugin-core/areas';

type InnerProps = {
  aiHub: AIHubKind | null;
  aiHubError?: Error;
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
  flags?: FlagState | null;
  children: React.ReactNode;
};

const Inner: React.FC<InnerProps> = ({
  aiHub,
  aiHubError,
  dscStatus,
  dsciStatus,
  flags,
  children,
}) => {
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
    () => ({ aiHub, aiHubError, dscStatus, dsciStatus, areasStatus }),
    [aiHub, aiHubError, dscStatus, dsciStatus, areasStatus],
  );

  return <AreaContext.Provider value={contextValue}>{children}</AreaContext.Provider>;
};

type AreaContextProps = {
  flags?: FlagState | null;
  children: React.ReactNode;
};

const AreaContextProvider: React.FC<AreaContextProps> = ({ flags, children }) => {
  const [aiHub, loadedAIHub, errorAIHub] = useFetchAIHub();
  const [dscStatus, loadedDsc, errorDsc] = useFetchDscStatus();
  const [dsciStatus, loadedDsci, errorDsci] = useFetchDsciStatus();

  const error = errorDsc || errorDsci;
  // An AIHub failure is surfaced by the namespace consumers rather than
  // preventing unrelated dashboard areas from rendering.
  const loaded = (loadedAIHub || Boolean(errorAIHub)) && loadedDsc && loadedDsci;

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
    <Inner
      aiHub={aiHub}
      aiHubError={errorAIHub}
      dscStatus={dscStatus}
      dsciStatus={dsciStatus}
      flags={flags}
    >
      {children}
    </Inner>
  );
};
export default AreaContextProvider;
