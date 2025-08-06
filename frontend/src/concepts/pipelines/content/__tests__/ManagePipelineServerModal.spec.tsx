import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManagePipelineServerModal from '#~/concepts/pipelines/content/ManagePipelineServerModal';
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useNamespaceSecret from '#~/concepts/projects/apiHooks/useNamespaceSecret';
import { updatePipelineCaching } from '#~/api/pipelines/k8s';
import { NotificationWatcherContext } from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { SecretCategory, EnvironmentVariableType } from '#~/pages/projects/types';
import useNotification from '#~/utilities/useNotification';

// Mock dependencies
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/concepts/projects/apiHooks/useNamespaceSecret', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/api/pipelines/k8s', () => ({
  updatePipelineCaching: jest.fn(),
}));

jest.mock('#~/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUsePipelinesAPI = usePipelinesAPI as jest.MockedFunction<typeof usePipelinesAPI>;
const mockUseNamespaceSecret = useNamespaceSecret as jest.MockedFunction<typeof useNamespaceSecret>;
const mockUpdatePipelineCaching = updatePipelineCaching as jest.MockedFunction<
  typeof updatePipelineCaching
>;
const mockUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;

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

    mockUpdatePipelineCaching.mockResolvedValue(
      {} as Awaited<ReturnType<typeof updatePipelineCaching>>,
    );

    mockUseNotification.mockReturnValue({
      success: mockSuccessNotification,
      error: mockErrorNotification,
      info: jest.fn(),
      warning: jest.fn(),
    });
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
    expect(screen.getByText('All pipelines will be prevented from caching.')).toBeInTheDocument();
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
    expect(screen.getByText('All pipelines will be prevented from caching.')).toBeInTheDocument();

    // Check the checkbox again
    fireEvent.click(cachingCheckbox);

    // Now checked, alert should disappear
    expect(cachingCheckbox).toBeChecked();
    expect(screen.queryByText('Caching is disabled')).not.toBeInTheDocument();
  });

  it('should call updatePipelineCaching when save button is clicked', async () => {
    renderModal();
    // Uncheck the caching checkbox to make a change
    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    fireEvent.click(cachingCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePipelineCaching).toHaveBeenCalledWith('test-project', false);
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
        'Pipeline caching updated',
        'Caching has been disabled successfully.',
      );
    });
  });

  it('should show error notification on failed save', async () => {
    // Suppress console.error for this test since we're intentionally testing error handling
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Update failed');
    mockUpdatePipelineCaching.mockRejectedValue(error);

    renderModal();

    // Uncheck the caching checkbox to make a change
    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    fireEvent.click(cachingCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockErrorNotification).toHaveBeenCalledWith(
        'Failed to update pipeline caching',
        'An unexpected error occurred while updating caching settings.',
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
});
