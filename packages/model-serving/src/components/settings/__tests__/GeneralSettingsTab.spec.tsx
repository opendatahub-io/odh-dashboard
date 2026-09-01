import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNotification } from '@odh-dashboard/ui-core';
import type { ClusterSettingsType } from '@odh-dashboard/plugin-core/host-api';
import GeneralSettingsTab from '../GeneralSettingsTab';

const mockFetchClusterSettings = jest.fn();
const mockUpdateClusterSettings = jest.fn();

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  useNotification: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useHostApiCore: () => ({
    fetchClusterSettings: mockFetchClusterSettings,
    updateClusterSettings: mockUpdateClusterSettings,
  }),
  useTrackEvent: () => jest.fn(),
}));
jest.mock('../ModelServingPlatformSettings', () => ({
  __esModule: true,
  default: ({
    enabledPlatforms,
    setEnabledPlatforms,
    isDistributedInferencingDefault,
    setIsDistributedInferencingDefault,
  }: {
    enabledPlatforms: { kServe: boolean; LLMd: boolean };
    setEnabledPlatforms: (p: { kServe: boolean; LLMd: boolean }) => void;
    isDistributedInferencingDefault: boolean;
    setIsDistributedInferencingDefault: (v: boolean) => void;
  }) => (
    <div data-testid="model-serving-platform-settings">
      <span data-testid="kserve-enabled">{String(enabledPlatforms.kServe)}</span>
      <span data-testid="llmd-enabled">{String(enabledPlatforms.LLMd)}</span>
      <span data-testid="distributed-default">{String(isDistributedInferencingDefault)}</span>
      <button
        type="button"
        data-testid="toggle-kserve"
        onClick={() =>
          setEnabledPlatforms({ ...enabledPlatforms, kServe: !enabledPlatforms.kServe })
        }
      >
        Toggle KServe
      </button>
      <button
        type="button"
        data-testid="toggle-distributed"
        onClick={() => setIsDistributedInferencingDefault(!isDistributedInferencingDefault)}
      >
        Toggle Distributed
      </button>
    </div>
  ),
}));
jest.mock('../DeploymentStrategySettings', () => ({
  ...jest.requireActual('../DeploymentStrategySettings'),
  __esModule: true,
  default: ({
    defaultDeploymentStrategy,
    setDefaultDeploymentStrategy,
  }: {
    defaultDeploymentStrategy: string;
    setDefaultDeploymentStrategy: (v: string) => void;
  }) => (
    <div data-testid="deployment-strategy-settings">
      <span data-testid="strategy-value">{defaultDeploymentStrategy}</span>
      <button
        type="button"
        data-testid="set-recreate"
        onClick={() => setDefaultDeploymentStrategy('recreate')}
      >
        Set Recreate
      </button>
    </div>
  ),
}));

const mockNotification = { success: jest.fn(), error: jest.fn() };

const DEFAULT_CLUSTER_SETTINGS: ClusterSettingsType = {
  pvcSize: 20,
  cullerTimeout: 31536000,
  userTrackingEnabled: false,
  modelServingPlatformEnabled: { kServe: true, LLMd: true },
  isDistributedInferencingDefault: true,
  defaultDeploymentStrategy: 'rolling',
  globalMLflowNamespaces: [],
};

describe('GeneralSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useNotification)
      .mockReturnValue(mockNotification as unknown as ReturnType<typeof useNotification>);
    mockFetchClusterSettings.mockResolvedValue(DEFAULT_CLUSTER_SETTINGS);
  });

  const renderAndWaitForLoad = async () => {
    render(<GeneralSettingsTab />);
    await screen.findByTestId('save-general-settings');
  };

  it('should show a spinner while loading', () => {
    render(<GeneralSettingsTab />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('save-general-settings')).not.toBeInTheDocument();
  });

  it('should render both settings sections after loading', async () => {
    await renderAndWaitForLoad();

    expect(screen.getByTestId('model-serving-platform-settings')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-strategy-settings')).toBeInTheDocument();
  });

  it('should show correct initial values from fetched settings', async () => {
    await renderAndWaitForLoad();

    expect(screen.getByTestId('kserve-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('llmd-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('distributed-default')).toHaveTextContent('true');
    expect(screen.getByTestId('strategy-value')).toHaveTextContent('rolling');
  });

  it('should disable save button when no changes are made', async () => {
    await renderAndWaitForLoad();

    expect(screen.getByTestId('save-general-settings')).toBeDisabled();
  });

  it('should enable save button when settings change', async () => {
    await renderAndWaitForLoad();

    fireEvent.click(screen.getByTestId('set-recreate'));

    expect(screen.getByTestId('save-general-settings')).toBeEnabled();
  });

  it('should save changes and show success notification', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndWaitForLoad();

    fireEvent.click(screen.getByTestId('set-recreate'));
    fireEvent.click(screen.getByTestId('save-general-settings'));

    await waitFor(() => {
      expect(mockUpdateClusterSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultDeploymentStrategy: 'recreate',
          pvcSize: 20,
          cullerTimeout: 31536000,
        }),
      );
    });

    expect(mockNotification.success).toHaveBeenCalledWith(
      'Model deployment settings saved successfully.',
      'It can take up to 2 minutes for configuration changes to be applied.',
    );
  });

  it('should show error notification when save fails', async () => {
    mockUpdateClusterSettings.mockRejectedValue(new Error('Save failed'));

    await renderAndWaitForLoad();

    fireEvent.click(screen.getByTestId('toggle-kserve'));
    fireEvent.click(screen.getByTestId('save-general-settings'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith('Error saving settings', 'Save failed');
    });
  });

  it('should show error notification when API returns success: false', async () => {
    mockUpdateClusterSettings.mockResolvedValue({
      success: false,
      error: 'Rejected by server',
    });

    await renderAndWaitForLoad();

    fireEvent.click(screen.getByTestId('set-recreate'));
    fireEvent.click(screen.getByTestId('save-general-settings'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Error saving settings',
        'Rejected by server',
      );
    });
  });

  it('should preserve non-model-serving fields in the save payload', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ success: true, error: '' });

    await renderAndWaitForLoad();

    fireEvent.click(screen.getByTestId('set-recreate'));
    fireEvent.click(screen.getByTestId('save-general-settings'));

    await waitFor(() => {
      expect(mockUpdateClusterSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          userTrackingEnabled: false,
          pvcSize: 20,
          cullerTimeout: 31536000,
          globalMLflowNamespaces: [],
        }),
      );
    });
  });

  it('should show error message when fetch fails', async () => {
    mockFetchClusterSettings.mockRejectedValue(new Error('Network error'));

    render(<GeneralSettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should disable save button while saving', async () => {
    let resolveUpdate: ((value: { success: boolean; error: string }) => void) | undefined;
    mockUpdateClusterSettings.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    await renderAndWaitForLoad();

    fireEvent.click(screen.getByTestId('set-recreate'));
    fireEvent.click(screen.getByTestId('save-general-settings'));

    expect(screen.getByTestId('save-general-settings')).toBeDisabled();

    resolveUpdate?.({ success: true, error: '' });

    await waitFor(() => {
      expect(mockNotification.success).toHaveBeenCalled();
    });
    expect(screen.getByTestId('save-general-settings')).toBeDisabled();
  });
});
