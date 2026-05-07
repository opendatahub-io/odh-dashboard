/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateExternalEndpointModal from '~/app/AIAssets/components/CreateExternalEndpointModal';
import {
  ExternalModelRequest,
  ExternalModelResponse,
  VerifyExternalModelRequest,
  VerifyExternalModelResponse,
} from '~/app/types';

describe('CreateExternalEndpointModal', () => {
  let mockOnClose: jest.Mock;
  let mockOnSuccess: jest.Mock;
  let mockOnSubmit: jest.Mock<Promise<ExternalModelResponse>, [ExternalModelRequest]>;
  let mockOnVerify: jest.Mock<Promise<VerifyExternalModelResponse>, [VerifyExternalModelRequest]>;
  let defaultProps: ReturnType<typeof getDefaultProps>;

  const getDefaultProps = () => ({
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    onSubmit: mockOnSubmit,
    onVerify: mockOnVerify,
    existingModels: [],
  });

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSuccess = jest.fn();
    mockOnSubmit = jest.fn<Promise<ExternalModelResponse>, [ExternalModelRequest]>();
    mockOnVerify = jest.fn<Promise<VerifyExternalModelResponse>, [VerifyExternalModelRequest]>();
    defaultProps = getDefaultProps();

    mockOnSubmit.mockResolvedValue({
      model_id: 'test-model',
      model_name: 'test-model',
      display_name: 'Test Model',
      description: 'Test model description',
      endpoints: [],
      serving_runtime: 'external',
      api_protocol: 'openai',
      version: 'v1',
      usecase: 'llm',
      status: 'Running',
      sa_token: {
        name: '',
        token_name: '',
        token: '',
      },
      model_source_type: 'custom_endpoint',
    });

    mockOnVerify.mockResolvedValue({
      success: true,
      message: 'External model verified successfully',
      response_time_ms: 500,
    });
  });

  // Helper to fill a text input quickly via fireEvent.change
  const fillInput = (input: HTMLElement, value: string) => {
    fireEvent.change(input, { target: { value } });
  };

  describe('Rendering', () => {
    it('should render modal with title and form fields', () => {
      render(<CreateExternalEndpointModal {...defaultProps} />);

      expect(screen.getByText('Create endpoint')).toBeInTheDocument();
      expect(screen.getByText('Model type')).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-id-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-display-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-url-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-token-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-use-cases-input')).toBeInTheDocument();
    });

    it('should render info alerts', () => {
      render(<CreateExternalEndpointModal {...defaultProps} />);

      expect(
        screen.getByText('Keys and tokens are visible to users who have access to the project.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('This model must expose an OpenAI-compatible chat/completions API.'),
      ).toBeInTheDocument();
    });

    it('should have default values', () => {
      render(<CreateExternalEndpointModal {...defaultProps} />);

      // Model type dropdown should show "Inferencing model" (llm is default)
      expect(screen.getByRole('button', { name: /Inferencing model/i })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<CreateExternalEndpointModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create endpoint')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when required fields are empty', () => {
      render(<CreateExternalEndpointModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /^Create$/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when all required fields are filled', () => {
      render(<CreateExternalEndpointModal {...defaultProps} />);

      fillInput(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      fillInput(screen.getByTestId('create-external-model-display-name-input'), 'My GPT-4o');
      fillInput(
        screen.getByTestId('create-external-model-url-input'),
        'https://model.svc.cluster.local/v1',
      );
      fillInput(screen.getByTestId('create-external-model-token-input'), 'sk-test-token');

      const submitButton = screen.getByRole('button', { name: /^Create$/i });
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Form Submission', () => {
    it('should submit with all fields filled', async () => {
      const user = userEvent.setup();
      render(<CreateExternalEndpointModal {...defaultProps} />);

      fillInput(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      fillInput(screen.getByTestId('create-external-model-display-name-input'), 'My Custom GPT-4o');
      fillInput(
        screen.getByTestId('create-external-model-url-input'),
        'https://model.svc.cluster.local/v1',
      );
      fillInput(screen.getByTestId('create-external-model-token-input'), 'sk-test-token-123');
      fillInput(screen.getByTestId('create-external-model-use-cases-input'), 'Chat and completion');

      await user.click(screen.getByRole('button', { name: /^Create$/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          model_id: 'gpt-4o',
          model_display_name: 'My Custom GPT-4o',
          base_url: 'https://model.svc.cluster.local/v1',
          secret_value: 'sk-test-token-123',
          model_type: 'llm',
          use_cases: 'Chat and completion',
        });
      });
    });

    it('should call onSuccess and onClose after successful submission', async () => {
      const user = userEvent.setup();
      render(<CreateExternalEndpointModal {...defaultProps} />);

      fillInput(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      fillInput(screen.getByTestId('create-external-model-display-name-input'), 'My GPT-4o');
      fillInput(
        screen.getByTestId('create-external-model-url-input'),
        'https://model.svc.cluster.local/v1',
      );
      fillInput(screen.getByTestId('create-external-model-token-input'), 'sk-test-token');

      await user.click(screen.getByRole('button', { name: /^Create$/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on submission failure', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue(new Error('API Error: Invalid token'));

      render(<CreateExternalEndpointModal {...defaultProps} />);

      fillInput(screen.getByTestId('create-external-model-id-input'), 'gpt-4o');
      fillInput(screen.getByTestId('create-external-model-display-name-input'), 'My GPT-4o');
      fillInput(
        screen.getByTestId('create-external-model-url-input'),
        'https://model.svc.cluster.local/v1',
      );
      fillInput(screen.getByTestId('create-external-model-token-input'), 'sk-bad-token');

      await user.click(screen.getByRole('button', { name: /^Create$/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to create external endpoint')).toBeInTheDocument();
        expect(screen.getByText('API Error: Invalid token')).toBeInTheDocument();
        expect(mockOnSuccess).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Conflict Validation', () => {
    it('should show conflict error and disable Verify and Create when model_id already exists', async () => {
      const user = userEvent.setup();
      const existingModel = {
        model_id: 'existing-model',
        display_name: 'Existing Model',
      };
      render(
        <CreateExternalEndpointModal {...defaultProps} existingModels={[existingModel as never]} />,
      );

      const modelIdInput = screen.getByTestId('create-external-model-id-input');
      await user.type(modelIdInput, existingModel.model_id);
      await user.tab(); // trigger blur/touched

      expect(
        screen.getByText(`Model ID "${existingModel.model_id}" is already in use.`),
      ).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-verify-button')).toBeDisabled();
      expect(screen.getByTestId('create-external-model-submit-button')).toBeDisabled();
    });

    it('should show conflict error and disable Create when display_name already exists', async () => {
      const user = userEvent.setup();
      const existingModel = {
        model_id: 'other-model',
        display_name: 'Taken Display Name',
      };
      render(
        <CreateExternalEndpointModal {...defaultProps} existingModels={[existingModel as never]} />,
      );

      const displayNameInput = screen.getByTestId('create-external-model-display-name-input');
      await user.type(displayNameInput, existingModel.display_name);
      await user.tab(); // trigger blur/touched

      expect(
        screen.getByText(`Display name "${existingModel.display_name}" is already in use.`),
      ).toBeInTheDocument();
      expect(screen.getByTestId('create-external-model-submit-button')).toBeDisabled();
    });
  });

  describe('Modal Close Behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateExternalEndpointModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
