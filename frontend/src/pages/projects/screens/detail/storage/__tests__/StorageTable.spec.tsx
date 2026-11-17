import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type { ProjectDetailsContextType } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import StorageTable from '#~/pages/projects/screens/detail/storage/StorageTable';
import { useClusterStorageConnectedResources } from '#~/pages/projects/screens/detail/storage/useClusterStorageConnectedResources';
import { useGetConnectedResources } from '#~/pages/projects/screens/detail/connections/useGetConnectedResources';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/concepts/k8s/useStorageClasses', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useClusterStorageConnectedResources', () => ({
  useClusterStorageConnectedResources: jest.fn(),
}));

jest.mock('../../connections/useGetConnectedResources', () => ({
  useGetConnectedResources: jest.fn(),
}));

jest.mock('../StorageTableRow', () => ({
  __esModule: true,
  default: jest.fn((props: { additionalResourcesLoaded: boolean }) => (
    <tr data-testid="storage-table-row" data-loaded={String(props.additionalResourcesLoaded)}>
      <td />
    </tr>
  )),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseStorageClasses = jest.mocked(useStorageClasses);
const mockUseClusterStorageConnectedResources = jest.mocked(useClusterStorageConnectedResources);
const mockUseGetConnectedResources = jest.mocked(useGetConnectedResources);

const mockClusterHookNotifications = <span data-testid="cluster-storage-hook-notifications" />;
const mockConnectionsHookNotifications = <span data-testid="connections-hook-notifications" />;

describe('StorageTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });
    mockUseStorageClasses.mockReturnValue([[], true, undefined, () => Promise.resolve([])]);
    mockUseClusterStorageConnectedResources.mockReturnValue({
      hasExtensions: true,
      loaded: true,
      getConnectedResourceLabels: jest.fn(() => []),
      hookNotifications: mockClusterHookNotifications,
    });
    mockUseGetConnectedResources.mockReturnValue({
      hasExtensions: true,
      loaded: true,
      getConnectedResourceLabels: jest.fn(() => []),
      hookNotifications: mockConnectionsHookNotifications,
    });
  });

  it('should mount hook notifications from both connected-resource extensions', () => {
    const project = mockProjectK8sResource({});
    const pvc = mockPVCK8sResource({});

    render(
      <ProjectDetailsContext.Provider
        value={{ currentProject: project } as ProjectDetailsContextType}
      >
        <StorageTable pvcs={[pvc]} refresh={() => undefined} onAddPVC={() => undefined} />
      </ProjectDetailsContext.Provider>,
    );

    expect(screen.getByTestId('cluster-storage-hook-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('connections-hook-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('storage-table-row')).toHaveAttribute('data-loaded', 'true');
  });

  it('should stay unloaded until both connected-resource extensions are loaded', () => {
    mockUseGetConnectedResources.mockReturnValue({
      hasExtensions: true,
      loaded: false,
      getConnectedResourceLabels: jest.fn(() => []),
      hookNotifications: mockConnectionsHookNotifications,
    });

    const project = mockProjectK8sResource({});
    const pvc = mockPVCK8sResource({});

    render(
      <ProjectDetailsContext.Provider
        value={{ currentProject: project } as ProjectDetailsContextType}
      >
        <StorageTable pvcs={[pvc]} refresh={() => undefined} onAddPVC={() => undefined} />
      </ProjectDetailsContext.Provider>,
    );

    expect(screen.getByTestId('storage-table-row')).toHaveAttribute('data-loaded', 'false');
  });
});
