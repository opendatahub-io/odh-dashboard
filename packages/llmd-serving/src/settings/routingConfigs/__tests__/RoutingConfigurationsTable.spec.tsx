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
import RoutingConfigurationsTable from '../RoutingConfigurationsTable';
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

const mockDeleteLlmInferenceServiceConfigIfUnreferenced = jest.mocked(
  deleteLlmInferenceServiceConfigIfUnreferenced,
);

describe('RoutingConfigurationsTable', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it('should deliver toggle failures to the host notification provider', async () => {
    jest.mocked(patchLLMInferenceServiceConfig).mockRejectedValue(new Error('Update denied'));
    const config = mockLLMInferenceServiceConfigK8sResource({});
    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

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

  it('should require the config display name before deleting', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ displayName: 'Test Config' });

    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    expect(screen.getByTestId('delete-button')).toBeDisabled();

    const input = screen.getByTestId('delete-modal-input');
    fireEvent.change(input, { target: { value: 'Wrong Config' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('delete-button')).toBeDisabled();
    expect(mockDeleteLlmInferenceServiceConfigIfUnreferenced).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Test Config' } });
    expect(screen.getByTestId('delete-button')).toBeEnabled();
  });

  it('should close the modal without deleting when cancelled', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ displayName: 'Test Config' });

    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.click(screen.getByTestId('cancel-button'));

    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    expect(mockDeleteLlmInferenceServiceConfigIfUnreferenced).not.toHaveBeenCalled();
  });

  it('should close the delete modal on successful deletion', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockResolvedValue('deleted');

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-config',
      displayName: 'Test Config',
    });

    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.change(screen.getByTestId('delete-modal-input'), {
      target: { value: 'Test Config' },
    });
    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(mockDeleteLlmInferenceServiceConfigIfUnreferenced).toHaveBeenCalledWith(
        'test-config',
        'opendatahub',
        'routing',
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
      name: 'test-config',
      displayName: 'Test Config',
    });

    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.change(screen.getByTestId('delete-modal-input'), {
      target: { value: 'Test Config' },
    });
    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-model-error-message-alert')).toHaveTextContent(
        CONFIG_IN_USE_ERROR_MESSAGE,
      );
    });

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    expect(notification.warning).not.toHaveBeenCalled();
  });

  it('should keep the modal open when deletion is blocked by a finalizer', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockResolvedValue('blocked-pending');

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-config',
      displayName: 'Test Config',
    });

    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.change(screen.getByTestId('delete-modal-input'), {
      target: { value: 'Test Config' },
    });
    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-model-error-message-alert')).toHaveTextContent(
        CONFIG_DELETION_PENDING_MESSAGE,
      );
    });

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    expect(notification.warning).not.toHaveBeenCalled();
  });

  it('should show an inline error when delete request fails', async () => {
    mockDeleteLlmInferenceServiceConfigIfUnreferenced.mockRejectedValue(new Error('Network error'));

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-config',
      displayName: 'Test Config',
    });

    render(<RoutingConfigurationsTable configs={[config]} />, { wrapper });

    openDeleteModal();
    fireEvent.change(screen.getByTestId('delete-modal-input'), {
      target: { value: 'Test Config' },
    });
    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-model-error-message-alert')).toHaveTextContent(
        'Network error',
      );
    });

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });
});
