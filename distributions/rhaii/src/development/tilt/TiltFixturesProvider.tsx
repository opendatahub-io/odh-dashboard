import * as React from 'react';
import { HostApiContext, type HostApiServices } from '@odh-dashboard/plugin-core/host-api';
import UriConnectionFormFields, { createTiltUriConnectionType } from './UriConnectionFixture';
import { DashboardNamespaceContext } from '../../context/DashboardNamespaceContext';

type TiltFixturesProviderProps = {
  children: React.ReactNode;
};

const TiltFixturesProvider: React.FC<TiltFixturesProviderProps> = ({ children }) => {
  const hostApi = React.useContext(HostApiContext);
  const dashboardNamespace = React.useContext(DashboardNamespaceContext);

  const fixtureHostApi = React.useMemo<HostApiServices>(() => {
    const connectionTypes = [createTiltUriConnectionType(dashboardNamespace)];

    return {
      ...hostApi,
      useWatchConnectionTypes: () => [
        connectionTypes,
        true,
        undefined,
        () => Promise.resolve(connectionTypes),
      ],
      ConnectionTypeFormFields: UriConnectionFormFields,
    };
  }, [dashboardNamespace, hostApi]);

  return <HostApiContext.Provider value={fixtureHostApi}>{children}</HostApiContext.Provider>;
};

export default TiltFixturesProvider;
