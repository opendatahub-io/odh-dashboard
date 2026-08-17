import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import ClusterSettings from '#~/pages/clusterSettings/ClusterSettings';
import { useAppContext } from '#~/app/AppContext';
import { useAppDispatch } from '#~/redux/hooks';
import { fetchClusterSettings, updateClusterSettings } from '#~/services/clusterSettingsService';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
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

jest.mock('#~/pages/clusterSettings/ModelServingPlatformSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="model-serving-platform-settings">Platform Settings</div>,
}));

jest.mock('#~/pages/clusterSettings/ModelDeploymentSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="model-deployment-settings">Deployment Settings</div>,
}));

jest.mock('#~/pages/clusterSettings/GlobalProjectSettings', () => ({
  __esModule: true,
  default: ({ setSelectedNamespace }: { setSelectedNamespace: (ns: string) => void }) => (
    <>
      <button type="button" onClick={() => setSelectedNamespace('new-project')}>
        Select global project
      </button>
      <button type="button" onClick={() => setSelectedNamespace('')}>
        Clear global project
      </button>
    </>
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

  const renderAndWaitForLoad = async () => {
    render(<ClusterSettings />);
    await screen.findByTestId('submit-cluster-settings');
  };

  const clickAndWaitForEnabled = async (buttonText: string) => {
    fireEvent.click(screen.getByText(buttonText));

    await waitFor(() => {
      expect(screen.getByTestId('submit-cluster-settings')).toBeEnabled();
    });
  };

  it('should fire an Added tracking event when a global project is selected from empty on successful save', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndWaitForLoad();
    await clickAndWaitForEnabled('Select global project');

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: true,
          globalProjectName: 'Added',
        },
      );
    });
  });

  it('should fire a Changed tracking event when an existing global project is replaced on successful save', async () => {
    mockFetchClusterSettings.mockResolvedValue({
      ...DEFAULT_CONFIG,
      globalMLflowNamespaces: ['existing-ns'],
    });
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndWaitForLoad();
    await clickAndWaitForEnabled('Select global project');

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: true,
          globalProjectName: 'Changed',
        },
      );
    });
  });

  it('should fire a Removed tracking event when an existing global project is cleared on successful save', async () => {
    mockFetchClusterSettings.mockResolvedValue({
      ...DEFAULT_CONFIG,
      globalMLflowNamespaces: ['existing-ns'],
    });
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndWaitForLoad();
    await clickAndWaitForEnabled('Clear global project');

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: true,
          globalProjectName: 'Removed',
        },
      );
    });
  });

  it('should not fire a global project tracking event when the global project is unchanged, even if other settings changed', async () => {
    mockFetchClusterSettings.mockResolvedValue({
      ...DEFAULT_CONFIG,
      globalMLflowNamespaces: ['existing-ns'],
    });
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndWaitForLoad();

    // Change an unrelated setting so the form is dirty, but leave the global project untouched.
    fireEvent.change(screen.getByTestId('pvc-size-input'), { target: { value: '25' } });

    await waitFor(() => {
      expect(screen.getByTestId('submit-cluster-settings')).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockUpdateClusterSettings).toHaveBeenCalled();
    });

    expect(mockFireFormTrackingEvent).not.toHaveBeenCalled();
  });

  it('should fire a failure tracking event with the error message when the update API rejects', async () => {
    const error = new Error('Update failed');
    mockUpdateClusterSettings.mockRejectedValue(error);

    await renderAndWaitForLoad();
    await clickAndWaitForEnabled('Select global project');

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: false,
          globalProjectName: 'Added',
          error: error.message,
        },
      );
    });
  });

  it('should fire a failure tracking event when the update API resolves unsuccessfully', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ success: false, error: 'Rejected by server' });

    await renderAndWaitForLoad();
    await clickAndWaitForEnabled('Select global project');

    fireEvent.click(screen.getByTestId('submit-cluster-settings'));

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        'Cluster Settings Global Project Selected',
        {
          outcome: 'submit',
          success: false,
          globalProjectName: 'Added',
          error: 'Rejected by server',
        },
      );
    });
  });

  it('should show model deployments section when MODEL_SERVING is on and MODEL_DEPLOYMENT_SETTINGS is off', async () => {
    mockUseIsAreaAvailable.mockImplementation(
      (area: string) =>
        ({
          status: area === SupportedArea.MODEL_SERVING,
          featureFlags: {},
          devFlags: {},
          reliantAreas: {},
          requiredComponents: {},
          requiredCapabilities: {},
          customCondition: jest.fn(),
        } as ReturnType<typeof useIsAreaAvailable>),
    );

    await renderAndWaitForLoad();

    expect(screen.getByText('Model deployments')).toBeInTheDocument();
    expect(screen.getByTestId('model-serving-platform-settings')).toBeInTheDocument();
    expect(screen.getByTestId('model-deployment-settings')).toBeInTheDocument();
  });

  it('should hide model deployments section when MODEL_DEPLOYMENT_SETTINGS flag is on', async () => {
    mockUseIsAreaAvailable.mockImplementation((area: string) => {
      const isOn =
        area === SupportedArea.MODEL_SERVING || area === SupportedArea.MODEL_DEPLOYMENT_SETTINGS;
      return {
        status: isOn,
        featureFlags: {},
        devFlags: {},
        reliantAreas: {},
        requiredComponents: {},
        requiredCapabilities: {},
        customCondition: jest.fn(),
      } as ReturnType<typeof useIsAreaAvailable>;
    });

    await renderAndWaitForLoad();

    expect(screen.queryByText('Model deployments')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-serving-platform-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-deployment-settings')).not.toBeInTheDocument();
  });
});
