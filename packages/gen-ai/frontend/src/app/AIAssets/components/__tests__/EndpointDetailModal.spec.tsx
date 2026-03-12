/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { AIModel } from '~/app/types';
import EndpointDetailModal from '~/app/AIAssets/components/EndpointDetailModal';

const mockGenerateToken = jest.fn();
const mockResetToken = jest.fn();

jest.mock('~/app/hooks/useGenerateMaaSToken', () => ({
  __esModule: true,
  default: () => mockUseGenerateMaaSToken(),
}));

let mockUseGenerateMaaSToken: jest.Mock = jest.fn(() => ({
  isGenerating: false,
  tokenData: null,
  error: null,
  generateToken: mockGenerateToken,
  resetToken: mockResetToken,
}));

jest.mock('~/app/utilities/utils', () => ({
  copyToClipboardWithTracking: jest.fn(),
}));

const createMockModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model',
  sa_token: { name: '', token_name: '', token: '' },
  ...overrides,
});

const renderModal = (model: AIModel, onClose = jest.fn()) =>
  render(
    <MemoryRouter>
      <EndpointDetailModal model={model} onClose={onClose} />
    </MemoryRouter>,
  );

describe('EndpointDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenerateMaaSToken = jest.fn(() => ({
      isGenerating: false,
      tokenData: null,
      error: null,
      generateToken: mockGenerateToken,
      resetToken: mockResetToken,
    }));
  });

  it('should render modal with title and description', () => {
    const model = createMockModel({ internalEndpoint: 'http://internal' });
    renderModal(model);

    expect(screen.getByText('Endpoints')).toBeInTheDocument();
    expect(
      screen.getByText(/Use this endpoint to connect your application to this model/),
    ).toBeInTheDocument();
  });

  it('should call onClose when Close button is clicked', () => {
    const onClose = jest.fn();
    const model = createMockModel({ internalEndpoint: 'http://internal' });
    renderModal(model, onClose);

    fireEvent.click(screen.getByTestId('endpoint-modal-close'));
    expect(mockResetToken).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  describe('External API endpoint', () => {
    it('should show external endpoint when available', () => {
      const model = createMockModel({
        externalEndpoint: 'https://api.example.com/models/test/v1',
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-modal-external-url')).toBeInTheDocument();
      expect(
        screen.getByText('Use this endpoint to access the model from outside the cluster.'),
      ).toBeInTheDocument();
    });

    it('should not show external endpoint when not available', () => {
      const model = createMockModel({ internalEndpoint: 'http://internal' });
      renderModal(model);

      expect(screen.queryByText('External API endpoint')).not.toBeInTheDocument();
    });
  });

  describe('Internal API endpoint', () => {
    it('should show internal endpoint when available', () => {
      const model = createMockModel({
        internalEndpoint: 'http://test-model.ns.svc.cluster.local:8080/v1',
      });
      renderModal(model);

      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-modal-internal-url')).toBeInTheDocument();
      expect(
        screen.getByText('Use this endpoint to access the model from within the cluster.'),
      ).toBeInTheDocument();
    });

    it('should not show internal endpoint when not available', () => {
      const model = createMockModel({
        externalEndpoint: 'https://api.example.com/models/test/v1',
      });
      renderModal(model);

      expect(screen.queryByText('Internal API endpoint')).not.toBeInTheDocument();
    });
  });

  describe('MaaS models', () => {
    it('should show both endpoints and API key section for MaaS models', () => {
      const model = createMockModel({
        isMaaSModel: true,
        externalEndpoint: 'https://api.example.com/models/test/v1',
        internalEndpoint: 'http://test-model.ns.svc.cluster.local:8080/v1',
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.getByText('API token')).toBeInTheDocument();
      expect(screen.getByText(/existing API keys/)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-modal-generate-api-key')).toBeInTheDocument();
    });

    it('should not show API key section for non-MaaS models', () => {
      const model = createMockModel({
        internalEndpoint: 'http://internal',
      });
      renderModal(model);

      expect(screen.queryByText('API token')).not.toBeInTheDocument();
    });

    it('should call generateToken when Generate API Key button is clicked', () => {
      const model = createMockModel({
        isMaaSModel: true,
        externalEndpoint: 'https://api.example.com/v1',
      });
      renderModal(model);

      fireEvent.click(screen.getByTestId('endpoint-modal-generate-api-key'));
      expect(mockGenerateToken).toHaveBeenCalled();
    });

    it('should show generated token with alert when token is available', () => {
      mockUseGenerateMaaSToken = jest.fn(() => ({
        isGenerating: false,
        tokenData: { token: 'generated-token-123' },
        error: null,
        generateToken: mockGenerateToken,
        resetToken: mockResetToken,
      }));

      const model = createMockModel({
        isMaaSModel: true,
        externalEndpoint: 'https://api.example.com/v1',
      });
      renderModal(model);

      expect(screen.getByText('Important: Copy and store this token')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-modal-api-key-copy')).toBeInTheDocument();
      expect(screen.queryByTestId('endpoint-modal-generate-api-key')).not.toBeInTheDocument();
    });

    it('should show error alert when token generation fails', () => {
      mockUseGenerateMaaSToken = jest.fn(() => ({
        isGenerating: false,
        tokenData: null,
        error: 'Failed to generate token',
        generateToken: mockGenerateToken,
        resetToken: mockResetToken,
      }));

      const model = createMockModel({
        isMaaSModel: true,
        externalEndpoint: 'https://api.example.com/v1',
      });
      renderModal(model);

      expect(screen.getByText('Error generating API key')).toBeInTheDocument();
      expect(screen.getByText('Failed to generate token')).toBeInTheDocument();
    });

    it('should disable Generate button while generating', () => {
      mockUseGenerateMaaSToken = jest.fn(() => ({
        isGenerating: true,
        tokenData: null,
        error: null,
        generateToken: mockGenerateToken,
        resetToken: mockResetToken,
      }));

      const model = createMockModel({
        isMaaSModel: true,
        externalEndpoint: 'https://api.example.com/v1',
      });
      renderModal(model);

      expect(screen.getByTestId('endpoint-modal-generate-api-key')).toBeDisabled();
    });
  });

  describe('Field matrix per model source', () => {
    it('should show only internal endpoint for Internal models', () => {
      const model = createMockModel({
        modelSource: 'namespace',
        internalEndpoint: 'http://granite-7b.ns.svc.cluster.local:8080/v1',
      });
      renderModal(model);

      expect(screen.queryByText('External API endpoint')).not.toBeInTheDocument();
      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.queryByText('API token')).not.toBeInTheDocument();
    });

    it('should show both endpoints for Internal models with external route', () => {
      const model = createMockModel({
        modelSource: 'namespace',
        externalEndpoint: 'https://api.example.com/models/mistral/v1',
        internalEndpoint: 'http://mistral-7b.ns.svc.cluster.local:8080/v1',
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.queryByText('API token')).not.toBeInTheDocument();
    });

    it('should show only external endpoint for External models', () => {
      const model = createMockModel({
        modelSource: 'external_provider',
        externalEndpoint: 'https://api.external-provider.com/v1',
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.queryByText('Internal API endpoint')).not.toBeInTheDocument();
      expect(screen.queryByText('API token')).not.toBeInTheDocument();
    });
  });
});
