import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import DeletePlaygroundModal from '~/app/Chatbot/components/DeletePlaygroundModal';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils');

jest.mock('~/app/shared/DeleteModal', () => ({
  __esModule: true,
  default: ({
    title,
    onClose,
    onDelete,
    deleting,
    error,
    submitButtonLabel,
    deleteName,
    children,
  }: {
    title: string;
    onClose: () => void;
    onDelete: () => void;
    deleting: boolean;
    error?: Error;
    submitButtonLabel: string;
    deleteName: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="delete-modal">
      <h1>{title}</h1>
      <p>{children}</p>
      <p>Deleting: {deleteName}</p>
      {error && <div data-testid="error">{error.message}</div>}
      <button onClick={onDelete} disabled={deleting}>
        {submitButtonLabel}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

const mockUseGenAiAPI = useGenAiAPI as jest.Mock;
const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockDeleteLSD = jest.fn();

const mockLsdStatus = {
  name: 'test-lsd',
  phase: 'Ready' as const,
  version: '1.0.0',
  distributionConfig: {
    activeDistribution: 'test-dist',
    providers: [],
    availableDistributions: {},
  },
};

const mockChatbotContextValue = {
  lsdStatus: mockLsdStatus,
  refresh: jest.fn(),
  models: [],
  modelsLoaded: true,
  lsdStatusLoaded: true,
  aiModels: [],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  modelsError: undefined,
  lsdStatusError: undefined,
  selectedModel: '',
  setSelectedModel: jest.fn(),
  lastInput: '',
  setLastInput: jest.fn(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GenAiContext.Provider value={mockGenAiContextValue}>
    <ChatbotContext.Provider
      value={mockChatbotContextValue as React.ContextType<typeof ChatbotContext>}
    >
      {children}
    </ChatbotContext.Provider>
  </GenAiContext.Provider>
);

describe('DeletePlaygroundModal', () => {
  const defaultProps = {
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: {
        deleteLSD: mockDeleteLSD,
      },
      refreshAllAPI: jest.fn(),
    });
  });

  it('renders delete modal with correct content', () => {
    render(
      <TestWrapper>
        <DeletePlaygroundModal {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('Delete playground?')).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone. This will delete the playground/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Deleting: Test Namespace/i)).toBeInTheDocument();
  });

  it('calls onCancel and fires cancel tracking event', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();

    render(
      <TestWrapper>
        <DeletePlaygroundModal onCancel={mockOnCancel} />
      </TestWrapper>,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Delete', {
      outcome: TrackingOutcome.cancel,
      namespace: 'test-namespace',
    });
  });

  it('successfully deletes playground', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();
    const mockRefresh = jest.fn();

    mockDeleteLSD.mockResolvedValue('success');

    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <ChatbotContext.Provider
          value={
            { ...mockChatbotContextValue, refresh: mockRefresh } as React.ContextType<
              typeof ChatbotContext
            >
          }
        >
          <DeletePlaygroundModal onCancel={mockOnCancel} />
        </ChatbotContext.Provider>
      </GenAiContext.Provider>,
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteLSD).toHaveBeenCalledWith({ name: 'test-lsd' });
    });

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Delete', {
        outcome: TrackingOutcome.submit,
        success: true,
        namespace: 'test-namespace',
      });
    });
  });

  it('handles deletion error', async () => {
    const user = userEvent.setup();
    const mockError = new Error('Failed to delete');

    mockDeleteLSD.mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <DeletePlaygroundModal {...defaultProps} />
      </TestWrapper>,
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Delete', {
        outcome: TrackingOutcome.submit,
        success: false,
        namespace: 'test-namespace',
        error: 'Failed to delete',
      });
    });

    // Check that error is displayed
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
});
