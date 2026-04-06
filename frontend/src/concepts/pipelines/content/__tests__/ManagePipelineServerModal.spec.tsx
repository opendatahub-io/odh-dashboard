import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import ManagePipelineServerModal from '#~/concepts/pipelines/content/ManagePipelineServerModal';
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useNamespaceSecret from '#~/concepts/projects/apiHooks/useNamespaceSecret';
import { updatePipelineSettings } from '#~/api/pipelines/k8s';
import { NotificationWatcherContext } from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { SecretCategory, EnvironmentVariableType } from '#~/pages/projects/types';
import useNotification from '#~/utilities/useNotification';
import { useAppContext } from '#~/app/AppContext';

// Mock dependencies
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/concepts/projects/apiHooks/useNamespaceSecret', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
}));

jest.mock('#~/api/pipelines/k8s', () => ({
  updatePipelineSettings: jest.fn(),
}));

jest.mock('#~/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/app/AppContext', () => ({
  useAppContext: jest.fn(),
}));

const mockUsePipelinesAPI = usePipelinesAPI as jest.MockedFunction<typeof usePipelinesAPI>;
const mockUseNamespaceSecret = useNamespaceSecret as jest.MockedFunction<typeof useNamespaceSecret>;
const mockUpdatePipelineSettings = updatePipelineSettings as jest.MockedFunction<
  typeof updatePipelineSettings
>;
const mockUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;
const mockUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;
const mockK8sGetResource = k8sGetResource as jest.MockedFunction<typeof k8sGetResource>;

describe('ManagePipelineServerModal', () => {
  const mockOnClose = jest.fn();
  const mockRegisterNotification = jest.fn();
  const mockSuccessNotification = jest.fn();
  const mockErrorNotification = jest.fn();

  // Mock scrollIntoView
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  const mockNotificationContext = {
    registerNotification: mockRegisterNotification,
    unregisterNotification: jest.fn(),
  };

  const defaultProps: React.ComponentProps<typeof ManagePipelineServerModal> = {
    onClose: mockOnClose,
    pipelineNamespaceCR: mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
    }),
  };

  const renderModal = (props = defaultProps) =>
    render(
      <NotificationWatcherContext.Provider value={mockNotificationContext}>
        <ManagePipelineServerModal {...props} />
      </NotificationWatcherContext.Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePipelinesAPI.mockReturnValue({
      namespace: 'test-project',
      apiAvailable: true,
      pipelinesServer: {
        initializing: false,
        installed: true,
        timedOut: false,
        compatible: true,
        name: 'dspa',
        crStatus: undefined,
        isStarting: false,
      },
      // Add other required properties with mock values
    } as ReturnType<typeof usePipelinesAPI>);

    mockUseNamespaceSecret.mockReturnValue([
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'test-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [
            { key: 'AWS_ACCESS_KEY_ID', value: 'test-access-key' },
            { key: 'AWS_SECRET_ACCESS_KEY', value: 'test-secret-key' },
          ],
        },
      },
      true,
      undefined,
      jest.fn(),
    ]);

    // Mock k8sGetResource to return a default DSPA resource
    // This is used by updatePipelineSettings to check for existing managedPipelines field
    mockK8sGetResource.mockResolvedValue(
      mockDataSciencePipelineApplicationK8sResource({
        name: 'dspa',
        namespace: 'test-project',
      }),
    );

    mockUpdatePipelineSettings.mockResolvedValue(
      {} as Awaited<ReturnType<typeof updatePipelineSettings>>,
    );

    mockUseNotification.mockReturnValue({
      success: mockSuccessNotification,
      error: mockErrorNotification,
      info: jest.fn(),
      warning: jest.fn(),
    });

    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({ automl: true, autorag: true }),
    } as ReturnType<typeof useAppContext>);
  });

  it('should render the modal with correct title', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Manage pipeline server')).toBeInTheDocument();
  });

  it('should display read-only object storage configuration', () => {
    renderModal();

    expect(screen.getByText('Object storage connection')).toBeInTheDocument();
    expect(screen.getByText('Access key')).toBeInTheDocument();
    expect(screen.getByText('Secret key')).toBeInTheDocument();
    expect(screen.getByText('Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Bucket')).toBeInTheDocument();

    // Check that object storage fields are read-only (displayed as text, not inputs)
    expect(screen.getByTestId('access-key-field')).toBeInTheDocument();
    expect(screen.getByTestId('secret-key-field')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-field')).toBeInTheDocument();
    expect(screen.getByTestId('bucket-field')).toBeInTheDocument();
  });

  it('should display additional configurations section with caching checkbox', () => {
    renderModal();

    // expect(screen.getByText('Additional Configurations')).toBeInTheDocument();
    expect(screen.getByText('Pipeline caching')).toBeInTheDocument();
    expect(
      screen.getByText('Allow caching to be configured per pipeline and task'),
    ).toBeInTheDocument();

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    const additionalTextHeader = screen.getByTestId('additionalConfig-headerText');
    const kubeStoreCheckbox = screen.getByTestId('pipeline-kubernetes-store-checkbox');

    expect(additionalTextHeader).toBeInTheDocument();
    expect(cachingCheckbox).toBeInTheDocument();
    expect(kubeStoreCheckbox).toBeInTheDocument();
  });

  it('should initialize caching checkbox with correct state from DSPA resource', () => {
    const pipelineWithCachingEnabled = mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
    });

    renderModal({
      ...defaultProps,
      pipelineNamespaceCR: pipelineWithCachingEnabled,
    });

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');

    expect(cachingCheckbox).toBeChecked();
  });

  it('should show warning alert when caching is disabled', () => {
    const pipelineWithCachingDisabled = mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
      cacheEnabled: false,
    });

    renderModal({
      ...defaultProps,
      pipelineNamespaceCR: pipelineWithCachingDisabled,
    });

    // Alert should be visible when caching is disabled
    expect(screen.getByText('Caching is disabled')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Disabling this option will turn off caching for all pipelines and tasks on this server. This overrides any cache configuration at the pipeline or task level.',
      ),
    ).toBeInTheDocument();
  });

  it('should toggle caching checkbox and show/hide alert accordingly', () => {
    const pipelineWithCachingEnabled = mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
    });

    pipelineWithCachingEnabled.spec.apiServer = {
      ...pipelineWithCachingEnabled.spec.apiServer,
      cacheEnabled: true,
    };

    renderModal({
      ...defaultProps,
      pipelineNamespaceCR: pipelineWithCachingEnabled,
    });

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');

    // Initially checked, no alert
    expect(cachingCheckbox).toBeChecked();
    expect(screen.queryByText('Caching is disabled')).not.toBeInTheDocument();

    // Uncheck the checkbox
    fireEvent.click(cachingCheckbox);

    // Now unchecked, alert should appear
    expect(cachingCheckbox).not.toBeChecked();
    expect(screen.getByText('Caching is disabled')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Disabling this option will turn off caching for all pipelines and tasks on this server. This overrides any cache configuration at the pipeline or task level.',
      ),
    ).toBeInTheDocument();
    // Check the checkbox again
    fireEvent.click(cachingCheckbox);

    // Now checked, alert should disappear
    expect(cachingCheckbox).toBeChecked();
    expect(screen.queryByText('Caching is disabled')).not.toBeInTheDocument();
  });

  it('should call updatePipelineSettings when save button is clicked', async () => {
    renderModal();
    // Uncheck the caching checkbox to make a change
    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    fireEvent.click(cachingCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePipelineSettings).toHaveBeenCalledWith(
        'test-project',
        {
          cacheEnabled: false,
        },
        'dspa',
      );
    });
  });

  it('should show success notification on successful save (for disabling caching)', async () => {
    renderModal();

    // Initially, alert should not be showing (caching is enabled by default)
    expect(screen.queryByTestId('pipeline-caching-disabled-alert')).not.toBeInTheDocument();

    // Uncheck the caching checkbox to make a change
    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    fireEvent.click(cachingCheckbox);

    // Alert should now be showing (caching is disabled)
    expect(screen.getByTestId('pipeline-caching-disabled-alert')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSuccessNotification).toHaveBeenCalledWith(
        'Pipeline server settings updated',
        'Settings have been updated successfully.',
      );
    });
  });

  it('should show error notification on failed save', async () => {
    // Suppress console.error for this test since we're intentionally testing error handling
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Update failed');
    mockUpdatePipelineSettings.mockRejectedValue(error);

    renderModal();

    // Uncheck the caching checkbox to make a change
    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    fireEvent.click(cachingCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockErrorNotification).toHaveBeenCalledWith(
        'Failed to update pipeline server settings',
        'An unexpected error occurred while updating settings.',
      );
    });

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('should close modal when cancel button is clicked', () => {
    renderModal();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable save button when no changes are made', () => {
    renderModal();

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when changes are made', () => {
    renderModal();

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');

    const saveButton = screen.getByRole('button', { name: 'Save' });

    // Initially disabled
    expect(saveButton).toBeDisabled();

    // Enable after making a change
    fireEvent.click(cachingCheckbox);
    expect(saveButton).toBeEnabled();
  });

  it('should show loading spinner when pipelineNamespaceCR is null', () => {
    renderModal({ ...defaultProps, pipelineNamespaceCR: null });

    expect(screen.getByText('Loading ...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display managed pipelines section', () => {
    renderModal();

    expect(screen.getByText('Managed pipelines')).toBeInTheDocument();
    expect(screen.getByTestId('managed-pipelines-checkbox')).toBeInTheDocument();
  });

  it('should initialize managed pipelines checkbox with correct state from DSPA resource', () => {
    const pipelineWithManagedPipelines = mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
      managedPipelines: {},
    });

    renderModal({
      ...defaultProps,
      pipelineNamespaceCR: pipelineWithManagedPipelines,
    });

    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    expect(managedPipelinesCheckbox).toBeChecked();
  });

  it('should toggle managed pipelines checkbox', () => {
    renderModal();

    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    // Initially unchecked
    expect(managedPipelinesCheckbox).not.toBeChecked();

    // Check it
    fireEvent.click(managedPipelinesCheckbox);
    expect(managedPipelinesCheckbox).toBeChecked();

    // Uncheck it
    fireEvent.click(managedPipelinesCheckbox);
    expect(managedPipelinesCheckbox).not.toBeChecked();
  });

  it('should enable save button when managed pipelines are toggled', () => {
    renderModal();

    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');
    const saveButton = screen.getByRole('button', { name: 'Save' });

    // Initially disabled
    expect(saveButton).toBeDisabled();

    // Enable after toggling managed pipeline
    fireEvent.click(managedPipelinesCheckbox);
    expect(saveButton).toBeEnabled();
  });

  it('should call updatePipelineSettings with managed pipelines when save is clicked', async () => {
    renderModal();

    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    fireEvent.click(managedPipelinesCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePipelineSettings).toHaveBeenCalledWith(
        'test-project',
        {
          managedPipelines: {},
        },
        'dspa',
      );
    });
  });

  it('should call updatePipelineSettings with both caching and managed pipelines changes', async () => {
    renderModal();

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    // Disable caching and enable managed pipelines
    fireEvent.click(cachingCheckbox);
    fireEvent.click(managedPipelinesCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePipelineSettings).toHaveBeenCalledWith(
        'test-project',
        {
          cacheEnabled: false,
          managedPipelines: {},
        },
        'dspa',
      );
    });
  });

  it('should call updatePipelineSettings with undefined managedPipelines when disabled', async () => {
    const pipelineWithManagedPipelines = mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
      managedPipelines: {},
    });

    renderModal({
      ...defaultProps,
      pipelineNamespaceCR: pipelineWithManagedPipelines,
    });

    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    // Initially checked, uncheck it
    expect(managedPipelinesCheckbox).toBeChecked();
    fireEvent.click(managedPipelinesCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePipelineSettings).toHaveBeenCalledWith(
        'test-project',
        {
          managedPipelines: undefined,
        },
        'dspa',
      );
    });
  });

  it('should not render managed pipelines section when automl and autorag are disabled', () => {
    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        automl: false,
        autorag: false,
      }),
    } as ReturnType<typeof useAppContext>);

    renderModal();

    expect(screen.queryByTestId('managed-pipelines-checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Managed pipelines')).not.toBeInTheDocument();
  });

  it('should render managed pipelines section when automl is enabled', () => {
    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        automl: true,
        autorag: false,
      }),
    } as ReturnType<typeof useAppContext>);

    renderModal();

    expect(screen.getByTestId('managed-pipelines-checkbox')).toBeInTheDocument();
    expect(screen.getByText('Managed pipelines')).toBeInTheDocument();
  });

  it('should render managed pipelines section when autorag is enabled', () => {
    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        automl: false,
        autorag: true,
      }),
    } as ReturnType<typeof useAppContext>);

    renderModal();

    expect(screen.getByTestId('managed-pipelines-checkbox')).toBeInTheDocument();
    expect(screen.getByText('Managed pipelines')).toBeInTheDocument();
  });

  it('should handle error when updating managed pipelines fails', async () => {
    // Suppress console.error for this test since we're intentionally testing error handling
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Failed to update managed pipelines');
    mockUpdatePipelineSettings.mockRejectedValue(error);

    renderModal();

    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    fireEvent.click(managedPipelinesCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockErrorNotification).toHaveBeenCalledWith(
        'Failed to update pipeline server settings',
        'An unexpected error occurred while updating settings.',
      );
    });

    // Modal should remain open after error
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('should reset state when pipelineNamespaceCR changes', () => {
    const { rerender } = renderModal();

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    const managedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    // Initially checked
    expect(cachingCheckbox).toBeChecked();
    expect(managedPipelinesCheckbox).not.toBeChecked();

    // User makes changes
    fireEvent.click(cachingCheckbox);
    fireEvent.click(managedPipelinesCheckbox);

    expect(cachingCheckbox).not.toBeChecked();
    expect(managedPipelinesCheckbox).toBeChecked();

    // Pipeline CR updates with new state
    const updatedPipeline = mockDataSciencePipelineApplicationK8sResource({
      name: 'dspa',
      namespace: 'test-project',
      cacheEnabled: false,
      managedPipelines: {},
    });

    rerender(
      <NotificationWatcherContext.Provider value={mockNotificationContext}>
        <ManagePipelineServerModal {...defaultProps} pipelineNamespaceCR={updatedPipeline} />
      </NotificationWatcherContext.Provider>,
    );

    // State should reset to match new CR
    const updatedCachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    const updatedManagedPipelinesCheckbox = screen.getByTestId('managed-pipelines-checkbox');

    expect(updatedCachingCheckbox).not.toBeChecked();
    expect(updatedManagedPipelinesCheckbox).toBeChecked();
  });
});
