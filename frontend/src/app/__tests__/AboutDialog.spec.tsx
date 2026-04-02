import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ClusterState, UserState } from '#~/redux/selectors/types';
import { useUser, useClusterInfo } from '#~/redux/selectors';
import { useAppContext } from '#~/app/AppContext';
import useFetchDsciStatus from '#~/concepts/areas/useFetchDsciStatus';
import useFetchDscStatus from '#~/concepts/areas/useFetchDscStatus';
import { mockDashboardConfig } from '#~/__mocks__';
import { BuildStatus, SubscriptionStatusData } from '#~/types';
import {
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
  StorageClassKind,
} from '#~/k8sTypes';
import { FetchState } from '#~/utilities/useFetchState';
import AboutDialog from '#~/app/AboutDialog';
import { useWatchOperatorSubscriptionStatus } from '#~/utilities/useWatchOperatorSubscriptionStatus';
import { DataScienceStackComponent } from '#~/concepts/areas/types';

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  ...jest.requireActual('#~/redux/selectors'),
  useUser: jest.fn(),
  useClusterInfo: jest.fn(),
}));

jest.mock('#~/concepts/areas/useFetchDsciStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/concepts/areas/useFetchDscStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/utilities/useWatchOperatorSubscriptionStatus', () => ({
  __esModule: true,
  useWatchOperatorSubscriptionStatus: jest.fn(),
}));

const useUserMock = jest.mocked(useUser);
const useAppContextMock = jest.mocked(useAppContext);
const useClusterInfoMock = jest.mocked(useClusterInfo);
const useFetchDsciStatusMock = jest.mocked(useFetchDsciStatus);
const useFetchDscStatusMock = jest.mocked(useFetchDscStatus);
const useWatchOperatorSubscriptionStatusMock = jest.mocked(useWatchOperatorSubscriptionStatus);

const originalPackageVersions = globalThis.__PACKAGE_VERSIONS__;

describe('AboutDialog', () => {
  const lastUpdated = new Date('2024-06-25T00:00:00Z');
  let dashboardConfig: DashboardConfigKind;
  let appContext: {
    buildStatuses: BuildStatus[];
    dashboardConfig: DashboardConfigKind;
    storageClasses: StorageClassKind[];
    isRHOAI: boolean;
    refreshDashboardConfig: jest.Mock;
  };
  let userInfo: UserState;
  const clusterInfo: ClusterState = { serverURL: 'https://test-server.com' };
  let dsciStatus: DataScienceClusterInitializationKindStatus;
  let dsciFetchStatus: FetchState<DataScienceClusterInitializationKindStatus>;
  let dscStatus: DataScienceClusterKindStatus;
  let dscFetchStatus: FetchState<DataScienceClusterKindStatus>;
  let operatorSubscriptionStatus: SubscriptionStatusData;
  let operatorSubscriptionFetchStatus: FetchState<SubscriptionStatusData>;

  afterEach(() => {
    globalThis.__PACKAGE_VERSIONS__ = originalPackageVersions;
  });

  beforeEach(() => {
    globalThis.__PACKAGE_VERSIONS__ = [];
    dashboardConfig = mockDashboardConfig({});
    if (dashboardConfig.metadata) {
      dashboardConfig.metadata.namespace = 'odh-dashboard';
    }
    appContext = {
      buildStatuses: [],
      dashboardConfig,
      storageClasses: [],
      isRHOAI: false,
      refreshDashboardConfig: jest.fn(),
    };
    dsciStatus = {
      conditions: [],
      release: {
        // eslint-disable-next-line no-restricted-syntax
        name: 'Open Data Hub Operator',
        version: '1.0.1',
      },
    };
    dscStatus = {
      components: {
        [DataScienceStackComponent.K_SERVE]: {
          releases: [
            {
              name: 'KServe',
              repoUrl: 'https://github.com/kserve/kserve',
              version: '1.12.0',
            },
          ],
        },
      },
      conditions: [],
    };
    dsciFetchStatus = [dsciStatus, true, undefined, () => Promise.resolve(dsciStatus)];
    dscFetchStatus = [dscStatus, true, undefined, () => Promise.resolve(dscStatus)];
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
      lastUpdated: lastUpdated.toISOString(),
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
    useFetchDscStatusMock.mockReturnValue(dscFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    const aboutText = await screen.findByTestId('about-text');
    const name = await screen.findByTestId('about-product-name');
    const version = await screen.findByTestId('about-version');
    const channel = await screen.findByTestId('about-channel');
    const accessLevel = await screen.findByTestId('about-access-level');
    const lastUpdate = await screen.findByTestId('about-last-update');
    const componentReleasesTable = await screen.findByTestId('component-releases-table');
    const componentReleasesTableHeader = await screen.findByTestId('component-releases-table');
    const componentReleasesTableRows = await screen.findAllByTestId('table-row-data');
    const displayedDate = new Date(lastUpdate.textContent);

    // eslint-disable-next-line no-restricted-syntax
    expect(aboutText.textContent).toContain('Open Data Hub');
    // eslint-disable-next-line no-restricted-syntax
    expect(name.textContent).toContain('Open Data Hub');
    expect(version.textContent).toContain('1.0.1');
    expect(channel.textContent).toContain('fast');
    expect(accessLevel.textContent).toContain('Non-administrator');
    expect(displayedDate.toDateString()).toBe(lastUpdated.toDateString());
    // Component releases table checks
    expect(componentReleasesTable).toBeInTheDocument();
    expect(componentReleasesTableHeader.textContent).toContain('ODH');
    expect(componentReleasesTableRows).not.toHaveLength(0);
    const hasComponentReleasesMetadata = componentReleasesTableRows.some(
      (row) => row.textContent.includes('KServe') && row.textContent.includes('1.12.0'),
    );
    expect(hasComponentReleasesMetadata).toBe(true);
  });

  it('should show the appropriate RHOAI values', async () => {
    if (dashboardConfig.metadata) {
      dashboardConfig.metadata.namespace = 'redhat-ods-applications';
    }
    appContext.isRHOAI = true;
    userInfo.isAdmin = true;
    if (dsciStatus.release) {
      dsciStatus.release.name = 'OpenShift AI Self-Managed version';
    }
    useAppContextMock.mockReturnValue(appContext);
    useUserMock.mockReturnValue(userInfo);
    useClusterInfoMock.mockReturnValue(clusterInfo);
    useFetchDsciStatusMock.mockReturnValue(dsciFetchStatus);
    useFetchDscStatusMock.mockReturnValue(dscFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    const aboutText = await screen.findByTestId('about-text');
    const name = await screen.findByTestId('about-product-name');
    const version = await screen.findByTestId('about-version');
    const channel = await screen.findByTestId('about-channel');
    const accessLevel = await screen.findByTestId('about-access-level');
    const lastUpdate = await screen.findByTestId('about-last-update');
    const componentReleasesTable = await screen.findByTestId('component-releases-table');
    const componentReleasesTableHeader = await screen.findByTestId('component-releases-table');
    const componentReleasesTableRows = await screen.findAllByTestId('table-row-data');
    const displayedDate = new Date(lastUpdate.textContent);

    // eslint-disable-next-line no-restricted-syntax
    expect(aboutText.textContent).toContain('OpenShift');
    expect(name.textContent).toContain('OpenShift AI');
    expect(version.textContent).toContain('1.0.1');
    expect(channel.textContent).toContain('fast');
    expect(accessLevel.textContent).toContain('Administrator');
    expect(displayedDate.toDateString()).toBe(lastUpdated.toDateString());
    // Component releases table checks
    expect(componentReleasesTable).toBeInTheDocument();
    expect(componentReleasesTableHeader.textContent).toContain('RHOAI');
    expect(componentReleasesTableRows).not.toHaveLength(0);
    const hasComponentReleasesMetadata = componentReleasesTableRows.some(
      (row) => row.textContent.includes('KServe') && row.textContent.includes('1.12.0'),
    );
    expect(hasComponentReleasesMetadata).toBe(true);
  });

  it('should not show packages table when __PACKAGE_VERSIONS__ is empty', async () => {
    globalThis.__PACKAGE_VERSIONS__ = [];
    useAppContextMock.mockReturnValue(appContext);
    useUserMock.mockReturnValue(userInfo);
    useClusterInfoMock.mockReturnValue(clusterInfo);
    useFetchDsciStatusMock.mockReturnValue(dsciFetchStatus);
    useFetchDscStatusMock.mockReturnValue(dscFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    expect(screen.queryByTestId('package-versions-table')).not.toBeInTheDocument();
  });

  it('should show packages table with versions and support levels when Dashboard row is expanded', async () => {
    globalThis.__PACKAGE_VERSIONS__ = [
      { name: '@odh-dashboard/model-serving', version: '0.0.0', supportLevel: 'GA' },
      { name: '@odh-dashboard/feature-store', version: '0.0.0', supportLevel: 'DP' },
      { name: '@odh-dashboard/model-training', version: '0.0.0', supportLevel: 'TP' },
    ];
    if (dscStatus.components) {
      dscStatus.components[DataScienceStackComponent.DASHBOARD] = {};
    }
    useAppContextMock.mockReturnValue(appContext);
    useUserMock.mockReturnValue(userInfo);
    useClusterInfoMock.mockReturnValue(clusterInfo);
    useFetchDsciStatusMock.mockReturnValue(dsciFetchStatus);
    useFetchDscStatusMock.mockReturnValue(dscFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    const packageTable = await screen.findByTestId('package-versions-table');
    expect(packageTable).toBeInTheDocument();

    const packageRows = await screen.findAllByTestId('package-table-row-data');
    expect(packageRows).toHaveLength(3);

    const packageNames = screen.getAllByTestId('package-name').map((el) => el.textContent);
    expect(packageNames).toEqual(['feature-store', 'model-serving', 'model-training']);

    const versions = screen.getAllByTestId('package-version').map((el) => el.textContent);
    expect(versions).toEqual(['0.0.0', '0.0.0', '0.0.0']);

    const supportLevels = screen
      .getAllByTestId('package-support-level')
      .map((el) => el.textContent);
    expect(supportLevels).toEqual([
      'Developer Preview',
      'Generally Available',
      'Technology Preview',
    ]);

    expect(screen.queryByTestId('dashboard-packages-hint')).not.toBeInTheDocument();

    const dashboardRow = screen.getByTestId('dashboard-component-row');
    const expandToggle = within(dashboardRow).getByRole('button');
    fireEvent.click(expandToggle);

    expect(screen.queryByTestId('package-versions-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-packages-hint')).toHaveTextContent(
      'Includes 3 packages. Expand for more details.',
    );
  });

  it('should show -- for packages without a support level', async () => {
    globalThis.__PACKAGE_VERSIONS__ = [
      { name: '@odh-dashboard/model-serving-backport', version: '0.0.0' },
    ];
    if (dscStatus.components) {
      dscStatus.components[DataScienceStackComponent.DASHBOARD] = {};
    }
    useAppContextMock.mockReturnValue(appContext);
    useUserMock.mockReturnValue(userInfo);
    useClusterInfoMock.mockReturnValue(clusterInfo);
    useFetchDsciStatusMock.mockReturnValue(dsciFetchStatus);
    useFetchDscStatusMock.mockReturnValue(dscFetchStatus);
    useWatchOperatorSubscriptionStatusMock.mockReturnValue(operatorSubscriptionFetchStatus);

    // eslint-disable-next-line no-restricted-syntax
    render(<AboutDialog onClose={jest.fn()} />);

    const packageTable = await screen.findByTestId('package-versions-table');
    expect(packageTable).toBeInTheDocument();

    const supportLevel = screen.getByTestId('package-support-level');
    expect(supportLevel.textContent).toBe('--');

    const packageName = screen.getByTestId('package-name');
    expect(packageName.textContent).toBe('model-serving-backport');
  });
});
