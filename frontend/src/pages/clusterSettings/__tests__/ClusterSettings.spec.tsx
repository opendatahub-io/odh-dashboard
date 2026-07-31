import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import ClusterSettings from '#~/pages/clusterSettings/ClusterSettings';
import { useAppContext } from '#~/app/AppContext';
import { useAppDispatch } from '#~/redux/hooks';
import { fetchClusterSettings, updateClusterSettings } from '#~/services/clusterSettingsService';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { DEFAULT_CONFIG } from '#~/pages/clusterSettings/const';

jest.mock('#~/app/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('#~/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/services/clusterSettingsService', () => ({
  fetchClusterSettings: jest.fn(),
  updateClusterSettings: jest.fn(),
}));

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

// Simplify GlobalProjectSettings to a single button that selects a new namespace,
// avoiding the need to stand up ProjectsContext/ProjectSelector for these tests.
jest.mock('#~/pages/clusterSettings/GlobalProjectSettings', () => ({
  __esModule: true,
  default: ({ setSelectedNamespace }: { setSelectedNamespace: (ns: string) => void }) => (
    <button type="button" onClick={() => setSelectedNamespace('new-project')}>
      Select global project
    </button>
  ),
}));

const mockUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;
const mockUseIsAreaAvailable = useIsAreaAvailable as jest.MockedFunction<typeof useIsAreaAvailable>;
const mockFetchClusterSettings = fetchClusterSettings as jest.MockedFunction<
  typeof fetchClusterSettings
>;
const mockUpdateClusterSettings = updateClusterSettings as jest.MockedFunction<
  typeof updateClusterSettings
>;
const mockFireFormTrackingEvent = fireFormTrackingEvent as jest.MockedFunction<
  typeof fireFormTrackingEvent
>;

describe('ClusterSettings', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAppDispatch.mockReturnValue(mockDispatch as ReturnType<typeof useAppDispatch>);

    mockUseAppContext.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({ globalProjectPrompts: true }),
      storageClasses: [],
      isRHOAI: false,
    });

    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      featureFlags: {},
      devFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: jest.fn(),
    } as ReturnType<typeof useIsAreaAvailable>);

    mockFetchClusterSettings.mockResolvedValue(DEFAULT_CONFIG);
  });

  const renderAndSelectGlobalProject = async () => {
    render(<ClusterSettings />);

    await screen.findByTestId('submit-cluster-settings');

    fireEvent.click(screen.getByText('Select global project'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-cluster-settings')).toBeEnabled();
    });
  };

  it('should fire a success tracking event with globalProjectName true on successful save', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndSelectGlobalProject();

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: true,
          globalProjectName: true,
        },
      );
    });
  });

  it('should fire a failure tracking event with the error message when the update API rejects', async () => {
    const error = new Error('Update failed');
    mockUpdateClusterSettings.mockRejectedValue(error);

    await renderAndSelectGlobalProject();

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: false,
          globalProjectName: true,
          error: error.message,
        },
      );
    });
  });

  it('should fire a failure tracking event when the update API resolves unsuccessfully', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ success: false, error: 'Rejected by server' });

    await renderAndSelectGlobalProject();

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: false,
          globalProjectName: true,
          error: 'Rejected by server',
        },
      );
    });
  });
});
