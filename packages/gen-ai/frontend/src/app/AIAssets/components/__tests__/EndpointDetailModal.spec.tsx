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
  model_source_type: 'namespace',
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
      screen.getByText(/Use the following URL endpoints to connect this model to your application/),
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
    const defaultSubscriptions = [{ name: 'test-sub', displayName: 'Test Sub' }];

    it('should show both endpoints and API key section for MaaS models', () => {
      const model = createMockModel({
        model_source_type: 'maas',
        externalEndpoint: 'https://api.example.com/models/test/v1',
        internalEndpoint: 'http://test-model.ns.svc.cluster.local:8080/v1',
        subscriptions: defaultSubscriptions,
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.getByText('Temporary API key')).toBeInTheDocument();
      expect(screen.getByText(/Create permanent API keys from the/)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-modal-generate-api-key')).toBeInTheDocument();
    });

    it('should not show API key section for non-MaaS models', () => {
      const model = createMockModel({
        internalEndpoint: 'http://internal',
      });
      renderModal(model);

      expect(screen.queryByText('Temporary API key')).not.toBeInTheDocument();
    });

    it('should call generateToken when Generate API Key button is clicked', () => {
      const model = createMockModel({
        model_source_type: 'maas',
        externalEndpoint: 'https://api.example.com/v1',
        subscriptions: defaultSubscriptions,
      });
      renderModal(model);

      fireEvent.click(screen.getByTestId('endpoint-modal-generate-api-key'));
      expect(mockGenerateToken).toHaveBeenCalledWith(undefined, 'test-sub');
    });

    it('should show generated token with alert when token is available', () => {
      mockUseGenerateMaaSToken = jest.fn(() => ({
        isGenerating: false,
        tokenData: { key: 'generated-token-123' },
        error: null,
        generateToken: mockGenerateToken,
        resetToken: mockResetToken,
      }));

      const model = createMockModel({
        model_source_type: 'maas',
        externalEndpoint: 'https://api.example.com/v1',
        subscriptions: defaultSubscriptions,
      });
      renderModal(model);

      expect(screen.getByText('Copy your temporary key')).toBeInTheDocument();
      expect(screen.getByText(/This key will expire in 1 hour/)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-modal-api-key-input')).toBeInTheDocument();
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
        model_source_type: 'maas',
        externalEndpoint: 'https://api.example.com/v1',
        subscriptions: defaultSubscriptions,
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
        model_source_type: 'maas',
        externalEndpoint: 'https://api.example.com/v1',
        subscriptions: defaultSubscriptions,
      });
      renderModal(model);

      expect(screen.getByTestId('endpoint-modal-generate-api-key')).toBeDisabled();
    });

    describe('Subscriptions', () => {
      it('should show subscription dropdown above Generate API key button when subscriptions are available', () => {
        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'basic-subscription',
              displayName: 'Basic Subscription',
              description: 'Basic tier',
            },
            {
              name: 'premium-subscription',
              displayName: 'Premium Subscription',
              description: 'Premium tier',
            },
          ],
        });
        renderModal(model);

        expect(screen.getByText('Subscription')).toBeInTheDocument();
        expect(screen.getByTestId('endpoint-modal-subscription-select')).toBeInTheDocument();
        expect(screen.getByTestId('endpoint-modal-generate-api-key')).toBeInTheDocument();
      });

      it('should select first subscription by default', () => {
        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'basic-subscription',
              displayName: 'Basic Subscription',
              description: 'Basic tier',
            },
          ],
        });
        renderModal(model);

        const selectButton = screen.getByTestId('endpoint-modal-subscription-select');
        expect(selectButton).toHaveTextContent('Basic Subscription');
      });

      it('should call generateToken with selected subscription when button is clicked', () => {
        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'premium-subscription',
              displayName: 'Premium Subscription',
              description: 'Premium tier',
            },
          ],
        });
        renderModal(model);

        fireEvent.click(screen.getByTestId('endpoint-modal-generate-api-key'));
        expect(mockGenerateToken).toHaveBeenCalledWith(undefined, 'premium-subscription');
      });

      it('should not show subscription dropdown for non-MaaS models', () => {
        const model = createMockModel({
          model_source_type: 'namespace',
          internalEndpoint: 'http://internal',
        });
        renderModal(model);

        expect(screen.queryByTestId('endpoint-modal-subscription-select')).not.toBeInTheDocument();
      });

      it('should change subscription selection when user selects different option', () => {
        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'basic-subscription',
              displayName: 'Basic Subscription',
              description: 'Basic tier',
            },
            {
              name: 'premium-subscription',
              displayName: 'Premium Subscription',
              description: 'Premium tier',
            },
          ],
        });
        renderModal(model);

        const selectButton = screen.getByTestId('endpoint-modal-subscription-select');

        // Default is first subscription
        expect(selectButton).toHaveTextContent('Basic Subscription');

        // Open the dropdown and select premium
        fireEvent.click(selectButton);
        const premiumOption = screen.getByText('Premium Subscription');
        fireEvent.click(premiumOption);

        expect(selectButton).toHaveTextContent('Premium Subscription');
      });

      it('should reset token when subscription is changed', () => {
        mockUseGenerateMaaSToken = jest.fn(() => ({
          isGenerating: false,
          tokenData: { key: 'existing-key', expiresAt: '2026-12-31T00:00:00Z' },
          error: null,
          generateToken: mockGenerateToken,
          resetToken: mockResetToken,
        }));

        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'basic-subscription',
              displayName: 'Basic Subscription',
              description: 'Basic tier',
            },
            {
              name: 'premium-subscription',
              displayName: 'Premium Subscription',
              description: 'Premium tier',
            },
          ],
        });
        renderModal(model);

        fireEvent.click(screen.getByTestId('endpoint-modal-subscription-select'));
        fireEvent.click(screen.getByText('Premium Subscription'));

        expect(mockResetToken).toHaveBeenCalled();
      });

      it('should pass changed subscription to generateToken', () => {
        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'basic-subscription',
              displayName: 'Basic Subscription',
              description: 'Basic tier',
            },
            {
              name: 'premium-subscription',
              displayName: 'Premium Subscription',
              description: 'Premium tier',
            },
          ],
        });
        renderModal(model);

        // Change from default (basic) to premium
        fireEvent.click(screen.getByTestId('endpoint-modal-subscription-select'));
        fireEvent.click(screen.getByText('Premium Subscription'));

        // Generate with the changed subscription
        fireEvent.click(screen.getByTestId('endpoint-modal-generate-api-key'));
        expect(mockGenerateToken).toHaveBeenCalledWith(undefined, 'premium-subscription');
      });

      it('should keep subscription dropdown visible after token is generated', () => {
        mockUseGenerateMaaSToken = jest.fn(() => ({
          isGenerating: false,
          tokenData: { key: 'generated-token-123' },
          error: null,
          generateToken: mockGenerateToken,
          resetToken: mockResetToken,
        }));

        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [
            {
              name: 'basic-subscription',
              displayName: 'Basic Subscription',
              description: 'Basic tier',
            },
          ],
        });
        renderModal(model);

        // Subscription dropdown should remain visible when token is present
        expect(screen.getByTestId('endpoint-modal-subscription-select')).toBeInTheDocument();
        expect(screen.getByTestId('endpoint-modal-subscription-select')).toHaveTextContent(
          'Basic Subscription',
        );
      });

      it('should show alert when no subscriptions are available', () => {
        const model = createMockModel({
          model_source_type: 'maas',
          externalEndpoint: 'https://api.example.com/v1',
          subscriptions: [],
        });
        renderModal(model);

        expect(
          screen.getByText(/You don't have any subscriptions for this model/),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Contact your administrator to request access/),
        ).toBeInTheDocument();
        expect(screen.queryByText('Authentication')).not.toBeInTheDocument();
        expect(screen.queryByText('Generate API key')).not.toBeInTheDocument();
      });
    });
  });

  describe('Field matrix per model source', () => {
    it('should show only internal endpoint for Internal models', () => {
      const model = createMockModel({
        model_source_type: 'namespace',
        internalEndpoint: 'http://granite-7b.ns.svc.cluster.local:8080/v1',
      });
      renderModal(model);

      expect(screen.queryByText('External API endpoint')).not.toBeInTheDocument();
      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.queryByText('Temporary API key')).not.toBeInTheDocument();
    });

    it('should show both endpoints for Internal models with external route', () => {
      const model = createMockModel({
        model_source_type: 'namespace',
        externalEndpoint: 'https://api.example.com/models/mistral/v1',
        internalEndpoint: 'http://mistral-7b.ns.svc.cluster.local:8080/v1',
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.getByText('Internal API endpoint')).toBeInTheDocument();
      expect(screen.queryByText('Temporary API key')).not.toBeInTheDocument();
    });

    it('should show only external endpoint for Custom endpoint models', () => {
      const model = createMockModel({
        model_source_type: 'custom_endpoint',
        externalEndpoint: 'https://api.custom-endpoint.com/v1',
      });
      renderModal(model);

      expect(screen.getByText('External API endpoint')).toBeInTheDocument();
      expect(screen.queryByText('Internal API endpoint')).not.toBeInTheDocument();
      expect(screen.queryByText('Temporary API key')).not.toBeInTheDocument();
    });
  });
});
