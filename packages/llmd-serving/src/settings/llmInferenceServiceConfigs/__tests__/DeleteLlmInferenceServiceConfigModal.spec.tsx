import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import DeleteLlmInferenceServiceConfigModal from '../DeleteLlmInferenceServiceConfigModal';
import { deleteLLMInferenceServiceConfig } from '../../../api/LLMInferenceServiceConfigs';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';

const { wrapper, trackEvent } = createTestProviders();

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  deleteLLMInferenceServiceConfig: jest.fn(),
}));

const mockDeleteLLMInferenceServiceConfig = jest.mocked(deleteLLMInferenceServiceConfig);

describe('DeleteLlmInferenceServiceConfigModal', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with config display name', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'my-config',
      displayName: 'My Custom Config',
    });

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    expect(screen.getByText('Delete LLM inference service configuration?')).toBeInTheDocument();
    expect(screen.getByText('My Custom Config')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should call deleteLLMInferenceServiceConfig on confirm', async () => {
    mockDeleteLLMInferenceServiceConfig.mockResolvedValue({} as K8sStatus);

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'delete-me',
      displayName: 'Delete Me Config',
      namespace: 'test-namespace',
    });

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    const confirmInput = screen.getByTestId('delete-modal-input');
    fireEvent.change(confirmInput, { target: { value: 'Delete Me Config' } });

    const deleteButton = screen.getByRole('button', { name: /delete llm inference service/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteLLMInferenceServiceConfig).toHaveBeenCalledWith(
        'delete-me',
        'test-namespace',
      );
    });
  });

  it('should call onClose(true) on successful delete with Enter', async () => {
    mockDeleteLLMInferenceServiceConfig.mockResolvedValue({} as K8sStatus);

    const config = mockLLMInferenceServiceConfigK8sResource({
      displayName: 'Config To Delete',
    });

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    const confirmInput = screen.getByTestId('delete-modal-input');
    fireEvent.change(confirmInput, { target: { value: 'Config To Delete' } });

    fireEvent.keyDown(confirmInput, { key: 'Enter' });

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledWith(true);
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving LLM Inference Service Config Deleted', {
      outcome: 'submit',
      success: true,
    });
  });

  it('should call onClose(false) on cancel', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({});

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledWith(false);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving LLM Inference Service Config Deleted', {
      outcome: 'cancel',
    });
    expect(trackEvent.mock.calls[0][1]).not.toHaveProperty('success');
  });

  it('should require the config display name before deleting', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ displayName: 'Test Config' });

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    expect(screen.getByTestId('delete-button')).toBeDisabled();

    const input = screen.getByTestId('delete-modal-input');
    fireEvent.change(input, { target: { value: 'Wrong Config' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('delete-button')).toBeDisabled();
    expect(mockDeleteLLMInferenceServiceConfig).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Test Config' } });
    expect(screen.getByTestId('delete-button')).toBeEnabled();
  });

  it('should show error on delete failure', async () => {
    const deleteError = new Error('Failed to delete config');
    mockDeleteLLMInferenceServiceConfig.mockRejectedValue(deleteError);

    const config = mockLLMInferenceServiceConfigK8sResource({
      displayName: 'Fail Config',
    });

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    fireEvent.change(screen.getByTestId('delete-modal-input'), {
      target: { value: 'Fail Config' },
    });

    fireEvent.click(screen.getByRole('button', { name: /delete llm inference service/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to delete config')).toBeInTheDocument();
    });

    expect(onCloseMock).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model Serving LLM Inference Service Config Deleted', {
      outcome: 'submit',
      success: false,
    });
  });

  it('should show loading state while deleting', async () => {
    let resolveDelete: (value: K8sStatus) => void = () => undefined;
    const deletePromise = new Promise<K8sStatus>((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteLLMInferenceServiceConfig.mockReturnValue(deletePromise);

    const config = mockLLMInferenceServiceConfigK8sResource({
      displayName: 'Loading Config',
    });

    render(<DeleteLlmInferenceServiceConfigModal config={config} onClose={onCloseMock} />, {
      wrapper,
    });

    fireEvent.change(screen.getByTestId('delete-modal-input'), {
      target: { value: 'Loading Config' },
    });

    const deleteButton = screen.getByRole('button', { name: /delete llm inference service/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
    });

    resolveDelete({} as K8sStatus);
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledWith(true));
  });
});
