import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ClusterState, UserState } from '~/redux/selectors/types';
import { useUser, useClusterInfo } from '~/redux/selectors';
import { useAppContext } from '~/app/AppContext';
import useFetchDsciStatus from '~/concepts/areas/useFetchDsciStatus';
import { mockDashboardConfig } from '~/__mocks__';
import { BuildStatus, SubscriptionStatusData } from '~/types';
import {
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  StorageClassKind,
} from '~/k8sTypes';
import { FetchState } from '~/utilities/useFetchState';
import AboutDialog from '~/app/AboutDialog';
import { useWatchOperatorSubscriptionStatus } from '~/utilities/useWatchOperatorSubscriptionStatus';

jest.mock('~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('~/redux/selectors', () => ({
  ...jest.requireActual('~/redux/selectors'),
  useUser: jest.fn(),
  useClusterInfo: jest.fn(),
}));

jest.mock('~/concepts/areas/useFetchDsciStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/utilities/useWatchOperatorSubscriptionStatus', () => ({
  __esModule: true,
  useWatchOperatorSubscriptionStatus: jest.fn(),
}));

const useUserMock = jest.mocked(useUser);
const useAppContextMock = jest.mocked(useAppContext);
const useClusterInfoMock = jest.mocked(useClusterInfo);
const useFetchDsciStatusMock = jest.mocked(useFetchDsciStatus);
const useWatchOperatorSubscriptionStatusMock = jest.mocked(useWatchOperatorSubscriptionStatus);

describe('AboutDialog', () => {
  let dashboardConfig: DashboardConfigKind;
  let appContext: {
    buildStatuses: BuildStatus[];
    dashboardConfig: DashboardConfigKind;
    storageClasses: StorageClassKind[];
    isRHOAI: boolean;
  };
  let userInfo: UserState;
  const clusterInfo: ClusterState = { serverURL: 'https://test-server.com' };
  let dsciStatus: DataScienceClusterInitializationKindStatus;
  let dsciFetchStatus: FetchState<DataScienceClusterInitializationKindStatus>;
  let operatorSubscriptionStatus: SubscriptionStatusData;
  let operatorSubscriptionFetchStatus: FetchState<SubscriptionStatusData>;

  beforeEach(() => {
    dashboardConfig = mockDashboardConfig({});
    dashboardConfig.metadata!.namespace = 'odh-dashboard';
    appContext = {
      buildStatuses: [],
      dashboardConfig,
      storageClasses: [],
      isRHOAI: false,
    };
    dsciStatus = {
      conditions: [],
      release: {
        // eslint-disable-next-line no-restricted-syntax
        name: 'Open Data Hub Operator',
        version: '1.0.1',
      },
    };
    dsciFetchStatus = [dsciStatus, true, undefined, () => Promise.resolve(dsciStatus)];
    userInfo = {
      username: 'test-user',
      userID: '1234',
      isAdmin: false,
      isAllowed: true,
      userLoading: false,
      userError: null,
    };
    operatorSubscriptionStatus = {
      channel: 'fast',
      lastUpdated: '2024-06-25T05:36:37Z',
    };
    operatorSubscriptionFetchStatus = [
      operatorSubscriptionStatus,
      true,
      undefined,
      () => Promise.resolve(operatorSubscriptionStatus),
    ];
  });

  it('should show the appropriate odh values', async () => {
    useAppContextMock.mockReturnValue(appContext);
    useUserMock.mockReturnValue(userInfo);
    useClusterInfoMock.mockReturnValue(clusterInfo);
    useFetchDsciStatusMock.mockReturnValue(dsciFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    const aboutText = await screen.findByTestId('about-text');
    const name = await screen.findByTestId('about-product-name');
    const version = await screen.findByTestId('about-version');
    const channel = await screen.findByTestId('about-channel');
    const accessLevel = await screen.findByTestId('about-access-level');
    const lastUpdate = await screen.findByTestId('about-last-update');

    // eslint-disable-next-line no-restricted-syntax
    expect(aboutText.textContent).toContain('Open Data Hub');
    // eslint-disable-next-line no-restricted-syntax
    expect(name.textContent).toContain('Open Data Hub');
    expect(version.textContent).toContain('1.0.1');
    expect(channel.textContent).toContain('fast');
    expect(accessLevel.textContent).toContain('Non-administrator');
    expect(lastUpdate.textContent).toContain('June 25, 2024');
  });

  it('should show the appropriate RHOAI values', async () => {
    dashboardConfig.metadata!.namespace = 'redhat-ods-applications';
    appContext.isRHOAI = true;
    userInfo.isAdmin = true;
    dsciStatus.release!.name = 'OpenShift AI Self-Managed version';

    useAppContextMock.mockReturnValue(appContext);
    useUserMock.mockReturnValue(userInfo);
    useClusterInfoMock.mockReturnValue(clusterInfo);
    useFetchDsciStatusMock.mockReturnValue(dsciFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    const aboutText = await screen.findByTestId('about-text');
    const name = await screen.findByTestId('about-product-name');
    const version = await screen.findByTestId('about-version');
    const channel = await screen.findByTestId('about-channel');
    const accessLevel = await screen.findByTestId('about-access-level');
    const lastUpdate = await screen.findByTestId('about-last-update');

    // eslint-disable-next-line no-restricted-syntax
    expect(aboutText.textContent).toContain('OpenShift');
    expect(name.textContent).toContain('OpenShift AI');
    expect(version.textContent).toContain('1.0.1');
    expect(channel.textContent).toContain('fast');
    expect(accessLevel.textContent).toContain('Administrator');
    expect(lastUpdate.textContent).toContain('June 25, 2024');
  });
});
