import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAppActions } from '@odh-dashboard/plugin-core';
import AppActionsProvider from '#~/plugins/AppActionsProvider';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(() => mockNavigate),
}));

jest.mock('#~/redux/hooks', () => ({
  useAppDispatch: jest.fn(() => mockDispatch),
}));

jest.mock('#~/redux/actions/actions', () => ({
  addNotification: jest.fn((payload) => ({ type: 'ADD_NOTIFICATION', payload })),
}));

const TestConsumer: React.FC = () => {
  const actions = useAppActions();
  return (
    <div>
      <button data-testid="navigate" onClick={() => actions.navigate('/test-path')}>
        Navigate
      </button>
      <button data-testid="notify-success" onClick={() => actions.notification.success('Done')}>
        Success
      </button>
      <button
        data-testid="notify-error"
        onClick={() => actions.notification.error('Failed', 'Details')}
      >
        Error
      </button>
      <button data-testid="notify-info" onClick={() => actions.notification.info('Info')}>
        Info
      </button>
      <button data-testid="notify-warning" onClick={() => actions.notification.warning('Warn')}>
        Warning
      </button>
      <button
        data-testid="open-modal"
        onClick={() =>
          actions.openModal(MockModal, { title: 'Test Modal' })
        }
      >
        Open Modal
      </button>
    </div>
  );
};

const MockModal: React.FC<{ onClose: () => void; title?: string }> = ({ onClose, title }) => (
  <div data-testid="mock-modal">
    <span data-testid="modal-title">{title}</span>
    <button data-testid="close-modal" onClick={onClose}>
      Close
    </button>
  </div>
);

describe('AppActionsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide navigate action', () => {
    render(
      <AppActionsProvider>
        <TestConsumer />
      </AppActionsProvider>,
    );

    fireEvent.click(screen.getByTestId('navigate'));
    expect(mockNavigate).toHaveBeenCalledWith('/test-path');
  });

  it('should provide notification actions', () => {
    render(
      <AppActionsProvider>
        <TestConsumer />
      </AppActionsProvider>,
    );

    fireEvent.click(screen.getByTestId('notify-success'));
    expect(mockDispatch).toHaveBeenCalled();

    mockDispatch.mockClear();
    fireEvent.click(screen.getByTestId('notify-error'));
    expect(mockDispatch).toHaveBeenCalled();

    mockDispatch.mockClear();
    fireEvent.click(screen.getByTestId('notify-info'));
    expect(mockDispatch).toHaveBeenCalled();

    mockDispatch.mockClear();
    fireEvent.click(screen.getByTestId('notify-warning'));
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should open and close a modal', async () => {
    render(
      <AppActionsProvider>
        <TestConsumer />
      </AppActionsProvider>,
    );

    expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Test Modal');

    fireEvent.click(screen.getByTestId('close-modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
    });
  });

  it('should support closing modal via returned ref', async () => {
    let modalRef: { close: () => void } | null = null;

    const RefConsumer: React.FC = () => {
      const actions = useAppActions();
      return (
        <div>
          <button
            data-testid="open"
            onClick={() => {
              modalRef = actions.openModal(MockModal);
            }}
          >
            Open
          </button>
          <button data-testid="close-via-ref" onClick={() => modalRef?.close()}>
            Close via ref
          </button>
        </div>
      );
    };

    render(
      <AppActionsProvider>
        <RefConsumer />
      </AppActionsProvider>,
    );

    fireEvent.click(screen.getByTestId('open'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('close-via-ref'));

    await waitFor(() => {
      expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
    });
  });
});
