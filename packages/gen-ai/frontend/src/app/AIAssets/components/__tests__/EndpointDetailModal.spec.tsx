/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import EndpointDetailModal, {
  buildModelUsageExample,
  getBaseURLEndpointType,
} from '~/app/AIAssets/components/EndpointDetailModal';
import type { AIModel } from '~/app/types';

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
  it('should render the modal title and description', () => {
    renderModal(createMockModel({ internalEndpoint: 'http://internal' }));

    expect(screen.getByText('Endpoints')).toBeInTheDocument();
    expect(
      screen.getByText(/Use the following URL endpoints to connect this model to your application/),
    ).toBeInTheDocument();
  });

  it('should call onClose when the close icon is clicked', () => {
    const onClose = jest.fn();
    renderModal(createMockModel({ internalEndpoint: 'http://internal' }), onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show Base URL, Model ID, and a usage example for MaaS models', () => {
    renderModal(
      createMockModel({
        model_source_type: 'maas',
        externalEndpoint: 'https://api.example.com/models/test/v1',
        subscriptions: [
          {
            name: 'limited',
            displayName: 'Limited',
            description: 'Lightweight access limited to smaller models.',
          },
          {
            name: 'standard',
            displayName: 'Standard',
          },
        ],
      }),
    );

    expect(screen.getByText('Base URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.example.com/models/test/v1')).toBeInTheDocument();
    expect(screen.getByText('Use this base URL for requests to MaaS models.')).toBeInTheDocument();
    expect(screen.getByText('Model ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-model-id')).toBeInTheDocument();
    expect(screen.getByText(/Use this exact identifier in the/)).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(
      screen.getByText(/To authenticate requests to this model, use an existing API key/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The API key must be scoped to a subscription that includes this model/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API keys' })).toHaveAttribute('href', '/maas/tokens');
    const subscriptionsToggle = screen.getByRole('button', { name: 'View subscriptions' });
    expect(subscriptionsToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(subscriptionsToggle);
    expect(screen.getByTestId('endpoint-modal-subscriptions-table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limited' })).toHaveAttribute(
      'href',
      '/maas/maas-governance/subscriptions/view/limited',
    );
    expect(screen.getByText('limited')).toBeInTheDocument();
    expect(screen.getByText('Lightweight access limited to smaller models.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Standard' })).toHaveAttribute(
      'href',
      '/maas/maas-governance/subscriptions/view/standard',
    );
    expect(screen.getByText('standard')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Usage example')).toBeInTheDocument();
    expect(screen.getByText(/export API_KEY="<your-api-key>"/)).toBeInTheDocument();
    expect(screen.getByText(/Authorization: Bearer \$API_KEY/)).toBeInTheDocument();
    expect(screen.getByText(/Set/)).toBeInTheDocument();
    expect(screen.queryByText('External API endpoint')).not.toBeInTheDocument();
    expect(screen.queryByText('Internal API endpoint')).not.toBeInTheDocument();
  });

  it('should show internal connection details and OpenShift token authentication for namespace models', () => {
    renderModal(createMockModel({ internalEndpoint: 'http://internal' }));

    expect(screen.getByText('Base URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://internal')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use this base URL for requests to the model. Internal endpoints must be accessed from within the cluster.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Model ID')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText(/Use an OpenShift token to authenticate requests/)).toBeInTheDocument();
    expect(screen.getByText('Usage example')).toBeInTheDocument();
    expect(screen.getByText(/export TOKEN="<your-openshift-token>"/)).toBeInTheDocument();
    expect(screen.getByText(/Authorization: Bearer \$TOKEN/)).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent === 'Set TOKEN to an OpenShift token before running this command.',
      ),
    ).not.toHaveLength(0);
  });

  it('should use the external Base URL and also show the internal Base URL for namespace models', () => {
    renderModal(
      createMockModel({
        externalEndpoint: 'https://external.example.com/v1',
        internalEndpoint: 'http://internal.example.com/v1',
      }),
    );

    expect(screen.getByDisplayValue('https://external.example.com/v1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://internal.example.com/v1')).toBeInTheDocument();
    expect(
      screen.getByText("curl -X POST 'https://external.example.com/v1/chat/completions' \\", {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('should classify a namespace Base URL as an internal endpoint', () => {
    expect(getBaseURLEndpointType('http://internal', 'http://internal')).toBe('internal');
    expect(getBaseURLEndpointType('https://external', 'http://internal')).toBe('external');
  });

  it('should show connection details and authentication guidance for custom endpoints', () => {
    renderModal(
      createMockModel({
        model_source_type: 'custom_endpoint',
        externalEndpoint: 'https://api.example.com/v1',
      }),
    );

    expect(screen.getByText('Base URL')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use this base URL for requests to the model. Internal endpoints must be accessed from within the cluster.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Model ID')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText(/Use the API key for the underlying model/)).toBeInTheDocument();
    expect(screen.getByText('Usage example')).toBeInTheDocument();
    expect(screen.queryByText('External API endpoint')).not.toBeInTheDocument();
  });

  it('should create an embeddings usage example for embedding models', () => {
    expect(
      buildModelUsageExample(
        'https://api.example.com/maas-api',
        'embed-model',
        'embedding',
        'apiKey',
      ),
    ).toContain("curl -X POST 'https://api.example.com/maas-api/v1/embeddings'");
    expect(
      buildModelUsageExample(
        'https://api.example.com/maas-api',
        'embed-model',
        'embedding',
        'apiKey',
      ),
    ).toContain('"input":"Hello, world!"');
  });

  it('should create a chat completions usage example for LLM models', () => {
    expect(
      buildModelUsageExample('https://api.example.com/maas-api', 'chat-model', 'llm', 'apiKey'),
    ).toContain("curl -X POST 'https://api.example.com/maas-api/v1/chat/completions'");
    expect(
      buildModelUsageExample('https://api.example.com/maas-api', 'chat-model', 'llm', 'apiKey'),
    ).toContain('"messages":[{"role":"user","content":"Hello, world!"}]');
  });

  it('should not duplicate the API version when the Base URL already ends in /v1', () => {
    expect(
      buildModelUsageExample('https://api.example.com/v1', 'chat-model', 'llm', 'apiKey'),
    ).toContain("curl -X POST 'https://api.example.com/v1/chat/completions'");
  });

  it('should omit a usage example for an invalid Base URL', () => {
    expect(buildModelUsageExample('ftp://api.example.com', 'chat-model', 'llm', 'apiKey')).toBe('');
  });
});
