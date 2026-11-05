import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import {
  deleteLlmInferenceServiceConfigIfUnreferenced,
  patchLLMInferenceServiceConfig,
} from '../../../api/LLMInferenceServiceConfigs';
import { CONFIG_DELETION_PENDING_MESSAGE, CONFIG_IN_USE_ERROR_MESSAGE } from '../../../utils';
import { TopologyType } from '../../../types';
import TopologyConfigurationsTable from '../TopologyConfigurationsTable';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';

const { notification, wrapper } = createTestProviders();

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/userSSAR', () => {
  const actual = jest.requireActual('@odh-dashboard/internal/concepts/userSSAR');
  return {
    ...actual,
    useKebabAccessAllowed: (actions: unknown[]) => actions,
  };
});

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  patchLLMInferenceServiceConfig: jest.fn(),
  deleteLlmInferenceServiceConfigIfUnreferenced: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/projects/components/DeleteModal', () => {
  const MockDeleteModal: React.FC<{
    onDelete: () => void;
    onClose: () => void;
    deleteName: string;
    error?: Error;
  }> = ({ onDelete, onClose, deleteName, error }) => (
    <div data-testid="delete-modal">
      <span data-testid="delete-name">{deleteName}</span>
      {error && <div data-testid="delete-error">{error.message}</div>}
      <button data-testid="confirm-delete" onClick={onDelete}>
        Confirm Delete
      </button>
      <button data-testid="cancel-delete" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
  return { __esModule: true, default: MockDeleteModal };
});

const mockDeleteLlmInferenceServiceConfigIfUnreferenced = jest.mocked(
  deleteLlmInferenceServiceConfigIfUnreferenced,
);

describe('TopologyConfigurationsTable', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it('should deliver toggle failures to the host notification provider', async () => {
    jest.mocked(patchLLMInferenceServiceConfig).mockRejectedValue(new Error('Update denied'));
    const config = mockLLMInferenceServiceConfigK8sResource({});
    render(<TopologyConfigurationsTable configs={[config]} />, { wrapper });

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(notification.error).toHaveBeenCalledWith(
        'Error disabling configuration',
        'Update denied',
      );
    });
  });

  const openDeleteModal = () => {
    const kebab = screen.getByRole('button', { name: /kebab toggle/i });
    fireEvent.click(kebab);
    const deleteAction = screen.getByRole('menuitem', { name: /delete/i });
    fireEvent.click(deleteAction);
  };

  it('should close the delete modal on successful deletion', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockResolvedValue('deleted');

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockDeleteLlmInferenceServiceConfigIfUnreferenced).toHaveBeenCalledWith(
        'test-topo-config',
        'opendatahub',
        'topology',
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });
  });

  it('should show an inline error when the config is in use', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockRejectedValue(
      new Error(CONFIG_IN_USE_ERROR_MESSAGE),
    );

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-error')).toHaveTextContent(CONFIG_IN_USE_ERROR_MESSAGE);
    });

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });

  it('should keep the modal open when deletion is blocked by a finalizer', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockResolvedValue('blocked-pending');

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-error')).toHaveTextContent(CONFIG_DELETION_PENDING_MESSAGE);
    });

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    expect(notification.warning).not.toHaveBeenCalled();
  });

  it('should show an inline error when delete request fails', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockRejectedValue(new Error('Network error'));

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-error')).toHaveTextContent('Network error');
    });

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });
});
