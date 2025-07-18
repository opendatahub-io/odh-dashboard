import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ConfigurePipelinesServerModal } from '#~/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelinesConnections from '#~/pages/projects/screens/detail/connections/usePipelinesConnections';
import { useIsAreaAvailable } from '#~/concepts/areas';
import { NotificationWatcherContext } from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { createPipelinesCR, deleteSecret } from '#~/api';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { configureDSPipelineResourceSpec } from '#~/concepts/pipelines/content/configurePipelinesServer/utils';

// Mock dependencies
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/detail/connections/usePipelinesConnections', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/concepts/areas', () => ({
  useIsAreaAvailable: jest.fn(),
  SupportedArea: {
    FINE_TUNING: 'fine-tuning',
  },
}));

jest.mock('#~/api', () => ({
  createPipelinesCR: jest.fn(),
  deleteSecret: jest.fn(),
  listPipelinesCR: jest.fn(),
}));

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/content/configurePipelinesServer/utils', () => ({
  configureDSPipelineResourceSpec: jest.fn(),
  objectStorageIsValid: jest.fn(),
}));

// Mock child components
jest.mock('#~/concepts/pipelines/content/configurePipelinesServer/ObjectStorageSection', () => ({
  ObjectStorageSection: () => <div>Object storage connection</div>,
}));

jest.mock(
  '#~/concepts/pipelines/content/configurePipelinesServer/PipelinesDatabaseSection',
  () => ({
    PipelinesDatabaseSection: () => <div>Database</div>,
  }),
);

jest.mock(
  '#~/concepts/pipelines/content/configurePipelinesServer/SamplePipelineSettingsSection',
  () => ({
    __esModule: true,
    default: () => <div>Sample pipeline settings</div>,
  }),
);

const mockUsePipelinesAPI = usePipelinesAPI as jest.MockedFunction<typeof usePipelinesAPI>;
const mockUsePipelinesConnections = usePipelinesConnections as jest.MockedFunction<
  typeof usePipelinesConnections
>;
const mockUseIsAreaAvailable = useIsAreaAvailable as jest.MockedFunction<typeof useIsAreaAvailable>;
const mockCreatePipelinesCR = createPipelinesCR as jest.MockedFunction<typeof createPipelinesCR>;
const mockDeleteSecret = deleteSecret as jest.MockedFunction<typeof deleteSecret>;
const mockFireFormTrackingEvent = fireFormTrackingEvent as jest.MockedFunction<
  typeof fireFormTrackingEvent
>;
const mockConfigureDSPipelineResourceSpec = configureDSPipelineResourceSpec as jest.MockedFunction<
  typeof configureDSPipelineResourceSpec
>;

describe('ConfigurePipelinesServerModal', () => {
  const mockOnClose = jest.fn();
  const mockRegisterNotification = jest.fn();

  // Mock scrollIntoView
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  const mockNotificationContext = {
    registerNotification: mockRegisterNotification,
    unregisterNotification: jest.fn(),
  };

  const defaultProps: React.ComponentProps<typeof ConfigurePipelinesServerModal> = {
    onClose: mockOnClose,
  };

  const renderModal = (props = defaultProps) =>
    render(
      <BrowserRouter>
        <NotificationWatcherContext.Provider value={mockNotificationContext}>
          <ConfigurePipelinesServerModal {...props} />
        </NotificationWatcherContext.Provider>
      </BrowserRouter>,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePipelinesAPI.mockReturnValue({
      project: {
        metadata: {
          name: 'test-project',
        },
      },
      namespace: 'test-project',
      startingStatusModalOpenRef: { current: null },
    } as ReturnType<typeof usePipelinesAPI>);

    mockUsePipelinesConnections.mockReturnValue([[], true, undefined, jest.fn()]);

    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      featureFlags: {},
      devFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: jest.fn(),
    } as ReturnType<typeof useIsAreaAvailable>);

    mockConfigureDSPipelineResourceSpec.mockResolvedValue(
      {} as Awaited<ReturnType<typeof configureDSPipelineResourceSpec>>,
    );

    mockCreatePipelinesCR.mockResolvedValue({
      metadata: { namespace: 'test-project' },
    } as Awaited<ReturnType<typeof createPipelinesCR>>);
  });

  it('should render the modal with correct title and description', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Configure pipeline server')).toHaveLength(2); // title and button
    expect(
      screen.getByText('Configuring a pipeline server enables you to create and manage pipelines.'),
    ).toBeInTheDocument();
  });

  it('should display info alert about configuration being non-editable', () => {
    renderModal();

    expect(
      screen.getByText(
        'Pipeline server configuration cannot be edited after creation. To use a different configuration after creation, delete the pipeline server and create a new one.',
      ),
    ).toBeInTheDocument();
  });

  it('should render all required sections', () => {
    renderModal();

    // Object Storage Section
    expect(screen.getByText('Object storage connection')).toBeInTheDocument();

    // Database Section
    expect(screen.getByText('Database')).toBeInTheDocument();

    // Pipeline Caching Section
    expect(screen.getByText('Pipeline caching')).toBeInTheDocument();
    expect(screen.getByText('Enable caching configuration in pipelines')).toBeInTheDocument();
  });

  it('should show fine-tuning section when available', () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      featureFlags: {},
      devFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: jest.fn(),
    } as ReturnType<typeof useIsAreaAvailable>);

    renderModal();

    expect(screen.getByText('Sample pipeline settings')).toBeInTheDocument();
  });

  it('should not show fine-tuning section when not available', () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      featureFlags: {},
      devFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: jest.fn(),
    } as ReturnType<typeof useIsAreaAvailable>);

    renderModal();

    expect(screen.queryByText('Sample pipeline settings')).not.toBeInTheDocument();
  });

  it('should have caching enabled by default', () => {
    renderModal();

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    expect(cachingCheckbox).toBeChecked();

    // Alert should not be visible when caching is enabled
    expect(screen.queryByTestId('pipeline-caching-disabled-alert')).not.toBeInTheDocument();
  });

  it('should show alert when caching is disabled', () => {
    renderModal();

    const cachingCheckbox = screen.getByTestId('pipeline-cache-enabling');
    fireEvent.click(cachingCheckbox);

    // Alert should be visible when caching is disabled
    expect(screen.getByTestId('pipeline-caching-disabled-alert')).toBeInTheDocument();
  });

  it('should enable submit button when form is valid', () => {
    // Mock objectStorageIsValid to return true
    const {
      objectStorageIsValid,
    } = require('#~/concepts/pipelines/content/configurePipelinesServer/utils');
    objectStorageIsValid.mockReturnValue(true);

    renderModal();

    const submitButton = screen.getByRole('button', { name: 'Configure pipeline server' });
    expect(submitButton).toBeEnabled();
  });

  it('should disable submit button when form is invalid', () => {
    // Mock objectStorageIsValid to return false
    const {
      objectStorageIsValid,
    } = require('#~/concepts/pipelines/content/configurePipelinesServer/utils');
    objectStorageIsValid.mockReturnValue(false);

    renderModal();

    const submitButton = screen.getByRole('button', { name: 'Configure pipeline server' });
    expect(submitButton).toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', () => {
    renderModal();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should track cancel event when cancelled', () => {
    renderModal();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Pipeline Server Configured', {
      outcome: 'cancel',
    });
  });

  it('should submit form successfully', async () => {
    // Mock objectStorageIsValid to return true
    const {
      objectStorageIsValid,
    } = require('#~/concepts/pipelines/content/configurePipelinesServer/utils');
    objectStorageIsValid.mockReturnValue(true);

    renderModal();

    const submitButton = screen.getByRole('button', { name: 'Configure pipeline server' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockConfigureDSPipelineResourceSpec).toHaveBeenCalled();
      expect(mockCreatePipelinesCR).toHaveBeenCalled();
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Pipeline Server Configured', {
      outcome: 'submit',
      success: true,
      isILabEnabled: false,
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle submission errors', async () => {
    // Mock objectStorageIsValid to return true
    const {
      objectStorageIsValid,
    } = require('#~/concepts/pipelines/content/configurePipelinesServer/utils');
    objectStorageIsValid.mockReturnValue(true);

    const error = new Error('Submission failed');
    mockCreatePipelinesCR.mockRejectedValue(error);

    renderModal();

    const submitButton = screen.getByRole('button', { name: 'Configure pipeline server' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Pipeline Server Configured', {
        outcome: 'submit',
        success: false,
        error,
      });
    });

    expect(mockDeleteSecret).toHaveBeenCalled();
    expect(screen.getByText('Submission failed')).toBeInTheDocument();
  });

  it('should disable submit button and show loading during submission', async () => {
    // Mock objectStorageIsValid to return true
    const {
      objectStorageIsValid,
    } = require('#~/concepts/pipelines/content/configurePipelinesServer/utils');
    objectStorageIsValid.mockReturnValue(true);

    // Make createPipelinesCR hang
    mockCreatePipelinesCR.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    renderModal();

    const submitButton = screen.getByRole('button', { name: 'Configure pipeline server' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should register notification for pipeline server creation polling', async () => {
    // Mock objectStorageIsValid to return true
    const {
      objectStorageIsValid,
    } = require('#~/concepts/pipelines/content/configurePipelinesServer/utils');
    objectStorageIsValid.mockReturnValue(true);

    renderModal();

    const submitButton = screen.getByRole('button', { name: 'Configure pipeline server' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegisterNotification).toHaveBeenCalledWith({
        callbackDelay: expect.any(Number),
        callback: expect.any(Function),
      });
    });
  });
});
