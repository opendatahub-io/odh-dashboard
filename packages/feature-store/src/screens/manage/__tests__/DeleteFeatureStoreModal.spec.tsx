import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { deleteFeatureStore } from '../../../api/featureStores';
import { FeatureStoreKind } from '../../../k8sTypes';
import DeleteFeatureStoreModal from '../DeleteFeatureStoreModal';

jest.mock('../../../api/featureStores', () => ({
  deleteFeatureStore: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/projects/components/DeleteModal', () => ({
  __esModule: true,
  default: ({
    title,
    onClose,
    onDelete,
    deleting,
    error,
    deleteName,
    children,
    submitButtonLabel,
  }: {
    title: string;
    onClose: () => void;
    onDelete: () => void;
    deleting: boolean;
    error?: Error;
    deleteName: string;
    children: React.ReactNode;
    submitButtonLabel: string;
  }) => (
    <div data-testid="delete-modal">
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-body">{children}</div>
      <div data-testid="delete-name">{deleteName}</div>
      <div data-testid="submit-label">{submitButtonLabel}</div>
      {deleting && <div data-testid="deleting-indicator">Deleting...</div>}
      {error && <div data-testid="error-message">{error.message}</div>}
      <button data-testid="submit-btn" onClick={onDelete}>
        Submit
      </button>
      <button data-testid="close-btn" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const deleteFeatureStoreMock = jest.mocked(deleteFeatureStore);

const mockFeatureStore: FeatureStoreKind = {
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: {
    name: 'test-store',
    namespace: 'test-ns',
  },
  spec: {
    feastProject: 'test',
  },
} as FeatureStoreKind;

describe('DeleteFeatureStoreModal', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with correct title and body', () => {
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Delete feature store "test-store"?',
    );
    expect(screen.getByTestId('modal-body')).toHaveTextContent('test-store');
    expect(screen.getByTestId('modal-body')).toHaveTextContent('test-ns');
    expect(screen.getByTestId('delete-name')).toHaveTextContent('test-store');
    expect(screen.getByTestId('submit-label')).toHaveTextContent('Delete feature store');
  });

  it('should call onClose(false) when modal close is clicked', async () => {
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('close-btn'));
    expect(onCloseMock).toHaveBeenCalledWith(false);
  });

  it('should call deleteFeatureStore and onClose(true) on successful delete', async () => {
    deleteFeatureStoreMock.mockResolvedValue({} as never);
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(deleteFeatureStoreMock).toHaveBeenCalledWith('test-ns', 'test-store');
      expect(onCloseMock).toHaveBeenCalledWith(true);
    });
  });

  it('should treat 404 error as successful delete', async () => {
    deleteFeatureStoreMock.mockRejectedValue(Object.assign(new Error('Not Found'), { code: 404 }));
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledWith(true);
    });
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('should show error on non-404 failure', async () => {
    deleteFeatureStoreMock.mockRejectedValue(new Error('Internal server error'));
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Internal server error');
    });
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
  });

  it('should clear stale error on retry', async () => {
    const user = userEvent.setup();
    deleteFeatureStoreMock.mockRejectedValueOnce(new Error('Server error'));
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);

    await user.click(screen.getByTestId('submit-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Server error');
    });

    deleteFeatureStoreMock.mockResolvedValueOnce({} as never);
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  it('should ignore close while deletion is in flight', async () => {
    let resolveDelete!: () => void;
    deleteFeatureStoreMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }) as never,
    );
    const user = userEvent.setup();
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);

    await user.click(screen.getByTestId('submit-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('deleting-indicator')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('close-btn'));
    expect(onCloseMock).not.toHaveBeenCalled();

    resolveDelete();
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledWith(true);
    });
  });

  it('should convert non-Error rejection to Error', async () => {
    deleteFeatureStoreMock.mockRejectedValue('string error');
    render(<DeleteFeatureStoreModal featureStore={mockFeatureStore} onClose={onCloseMock} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('string error');
    });
  });
});
