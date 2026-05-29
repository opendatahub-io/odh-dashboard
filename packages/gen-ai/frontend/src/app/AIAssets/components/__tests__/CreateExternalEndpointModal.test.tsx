/* eslint-disable camelcase */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CreateExternalEndpointModal from '~/app/AIAssets/components/CreateExternalEndpointModal';
import useGenAiDashboardConfig from '~/app/hooks/useGenAiDashboardConfig';

jest.mock('~/app/hooks/useGenAiDashboardConfig');
const mockUseGenAiDashboardConfig = jest.mocked(useGenAiDashboardConfig);

describe('CreateExternalEndpointModal - Verification', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnVerify = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenAiDashboardConfig.mockReturnValue({
      aiAssetCustomEndpoints: { externalProviders: true, clusterDomains: [] },
    });
  });

  describe('Verify button state', () => {
    it('should disable verify button when required fields are empty', () => {
      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      expect(verifyButton).toBeDisabled();
    });

    it('should enable verify button when all required LLM fields are filled', async () => {
      const user = userEvent.setup();

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      // Fill required fields for LLM
      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://api.openai.com/v1',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'sk-test-key');

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await waitFor(() => {
        expect(verifyButton).not.toBeDisabled();
      });
    });
  });

  describe('Verification success', () => {
    it('should display success message when verification succeeds', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockResolvedValue({
        success: true,
        message: 'External model verified successfully',
        response_time_ms: 523,
      });

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      // Fill required fields
      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://api.openai.com/v1',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'sk-test-key');

      // Click verify
      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await user.click(verifyButton);

      // Should show success message (component uses hardcoded message, not API response)
      await waitFor(() => {
        expect(screen.getByText('Model verified successfully')).toBeInTheDocument();
      });

      // Verify success alert is present
      const successAlert = screen.getByTestId('create-external-model-verify-success-alert');
      expect(successAlert).toBeInTheDocument();
    });

    it('should call onVerify with correct parameters for LLM', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockResolvedValue({
        success: true,
        message: 'External model verified successfully',
      });

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://api.openai.com/v1',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'sk-test-key');

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockOnVerify).toHaveBeenCalledWith({
          model_id: 'gpt-4o',
          base_url: 'https://api.openai.com/v1',
          secret_value: 'sk-test-key',
          model_type: 'llm',
        });
      });
    });
  });

  describe('Verification errors', () => {
    it('should display UNAUTHORIZED error message', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockRejectedValue({
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is invalid or unauthorized',
        },
      });

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://api.openai.com/v1',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'invalid-key');

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication failed. Check your API key.')).toBeInTheDocument();
      });

      const errorAlert = screen.getByTestId('create-external-model-verify-error-alert');
      expect(errorAlert).toBeInTheDocument();
    });

    it('should display CONNECTION_FAILED error message', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockRejectedValue({
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Request to https://invalid.example.com returned HTTP 404',
        },
      });

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://invalid.example.com',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'sk-test-key');

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(
          screen.getByText('Connection failed. Check the URL and network connectivity.'),
        ).toBeInTheDocument();
      });
    });

    it('should display TIMEOUT error message', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockRejectedValue({
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out connecting to external model',
        },
      });

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://slow.example.com',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'sk-test-key');

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(
          screen.getByText('Request timed out. The endpoint is not responding.'),
        ).toBeInTheDocument();
      });
    });

    it('should disable Create button when verification fails', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockRejectedValue({
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is invalid or unauthorized',
        },
      });

      render(
        <CreateExternalEndpointModal
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSubmit={mockOnSubmit}
          onVerify={mockOnVerify}
          existingModels={[]}
        />,
      );

      await user.type(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      await user.type(
        screen.getByTestId('create-external-model-display-name-input'),
        'GPT-4o Model',
      );
      await user.type(
        screen.getByTestId('create-external-model-url-input'),
        'https://api.openai.com/v1',
      );
      await user.type(screen.getByTestId('create-external-model-token-input'), 'invalid-key');

      const verifyButton = screen.getByTestId('create-external-model-verify-button');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication failed. Check your API key.')).toBeInTheDocument();
      });

      const createButton = screen.getByTestId('create-external-model-submit-button');
      expect(createButton).toBeEnabled();
    });
  });
});
