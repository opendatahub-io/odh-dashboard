import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import DeleteLlmAcceleratorConfigModal from '../DeleteLlmAcceleratorConfigModal';
import { deleteLLMInferenceServiceConfig } from '../../../api/LLMInferenceServiceConfigs';

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  deleteLLMInferenceServiceConfig: jest.fn(),
}));

const mockDeleteLLMInferenceServiceConfig = jest.mocked(deleteLLMInferenceServiceConfig);

describe('DeleteLlmAcceleratorConfigModal', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with config display name', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'my-config',
      displayName: 'My Custom Config',
    });

    render(<DeleteLlmAcceleratorConfigModal config={config} onClose={onCloseMock} />);

    expect(screen.getByText('Delete LLM accelerator configuration?')).toBeInTheDocument();
    expect(screen.getByText('My Custom Config')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should call deleteLLMInferenceServiceConfig on confirm', async () => {
    mockDeleteLLMInferenceServiceConfig.mockResolvedValue({} as any);

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'delete-me',
      namespace: 'test-namespace',
    });

    render(<DeleteLlmAcceleratorConfigModal config={config} onClose={onCloseMock} />);

    const deleteButton = screen.getByRole('button', { name: /delete llm accelerator/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteLLMInferenceServiceConfig).toHaveBeenCalledWith(
        'delete-me',
        'test-namespace',
      );
    });
  });

  it('should call onClose(true) on successful delete', async () => {
    mockDeleteLLMInferenceServiceConfig.mockResolvedValue({} as any);

    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<DeleteLlmAcceleratorConfigModal config={config} onClose={onCloseMock} />);

    const deleteButton = screen.getByRole('button', { name: /delete llm accelerator/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledWith(true);
    });
  });

  it('should call onClose(false) on cancel', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<DeleteLlmAcceleratorConfigModal config={config} onClose={onCloseMock} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledWith(false);
  });

  it('should show error on delete failure', async () => {
    const deleteError = new Error('Failed to delete config');
    mockDeleteLLMInferenceServiceConfig.mockRejectedValue(deleteError);

    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<DeleteLlmAcceleratorConfigModal config={config} onClose={onCloseMock} />);

    const deleteButton = screen.getByRole('button', { name: /delete llm accelerator/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete config')).toBeInTheDocument();
    });

    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should show loading state while deleting', async () => {
    let resolveDelete: (value: any) => void = () => {};
    const deletePromise = new Promise<any>((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteLLMInferenceServiceConfig.mockReturnValue(deletePromise);

    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<DeleteLlmAcceleratorConfigModal config={config} onClose={onCloseMock} />);

    const deleteButton = screen.getByRole('button', { name: /delete llm accelerator/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
    });

    resolveDelete({});
  });
});
