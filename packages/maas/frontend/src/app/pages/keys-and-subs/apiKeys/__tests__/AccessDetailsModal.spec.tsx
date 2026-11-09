/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MaaSModel } from '~/app/types/maas-model';
import type { APIKey } from '~/app/types/api-key';
import type { UserSubscription } from '~/app/types/subscriptions';
import AccessDetailsModal from '~/app/pages/keys-and-subs/apiKeys/AccessDetailsModal';

jest.mock('~/app/api/maas-models', () => ({
  getMaaSModelsList: () => () => Promise.resolve(mockMaaSModels),
}));

jest.mock('~/app/context/KeysAndSubsContext', () => ({
  useKeysAndSubsContext: () => ({
    subscriptions: mockSubscriptions,
    subscriptionsLoaded: true,
    gatewayUrl: 'https://example.invalid',
  }),
}));

jest.mock('~/app/api/subscriptions', () => ({
  getUserSubscription: () => (id: string) => () => Promise.resolve(mockGetUserSubscription(id)),
}));

const mockGetUserSubscription = jest.fn((id: string) => {
  if (id === 'external-subscription') {
    return externalSubscription;
  }
  return Promise.reject(new Error('Subscription not found'));
});

const mockMaaSModels: MaaSModel[] = [
  {
    id: 'publishers/test/models/model-a',
    object: 'model',
    created: 1,
    owned_by: 'ns-a/ref-a',
    ready: true,
    url: 'https://gateway.example.com',
    modelDetails: { displayName: 'Model A', modelCapabilities: ['text-generation'] },
  },
  {
    id: 'publishers/test/models/model-b',
    object: 'model',
    created: 2,
    owned_by: 'ns-a/ref-b',
    ready: true,
    url: 'https://gateway.example.com',
    modelDetails: { displayName: 'Model B', modelCapabilities: ['text-embedding'] },
  },
  {
    id: 'publishers/team-a/models/shared-model',
    object: 'model',
    created: 3,
    owned_by: 'team-a/shared-model',
    ready: true,
    url: 'https://gateway.example.com',
    modelDetails: { displayName: 'Shared Model A', modelCapabilities: ['text-generation'] },
  },
  {
    id: 'publishers/team-b/models/shared-model',
    object: 'model',
    created: 4,
    owned_by: 'team-b/shared-model',
    ready: true,
    url: 'https://gateway.example.com',
    modelDetails: { displayName: 'Shared Model B', modelCapabilities: ['text-generation'] },
  },
];

const mockSubscriptions: UserSubscription[] = [
  {
    subscription_id_header: 'test-subscription',
    subscription_description: 'Test subscription',
    display_name: 'Test Subscription',
    inference_priority: 1,
    model_refs: [
      {
        name: 'ref-a',
        model_name: 'publishers/test/models/model-a',
        display_name: 'Model A',
        namespace: 'ns-a',
      },
      {
        name: 'ref-b',
        model_name: 'publishers/test/models/model-b',
        display_name: 'Model B',
        namespace: 'ns-a',
      },
      {
        name: 'shared-model',
        display_name: 'Shared Model A',
        namespace: 'team-a',
      },
      {
        name: 'shared-model',
        display_name: 'Shared Model B',
        namespace: 'team-b',
      },
    ],
  },
];

const externalSubscription: UserSubscription = {
  subscription_id_header: 'external-subscription',
  subscription_description: 'Loaded individually',
  display_name: 'External Subscription',
  inference_priority: 1,
  model_refs: [
    {
      name: 'ref-a',
      model_name: 'publishers/test/models/model-a',
      display_name: 'Model A',
      namespace: 'ns-a',
    },
  ],
};

const mockApiKey: APIKey = {
  id: 'key-id',
  name: 'my-key',
  description: 'A test key',
  creationDate: '2026-10-01T00:00:00Z',
  expirationDate: new Date(2027, 0, 15, 12).toISOString(),
  status: 'active',
  subscription: 'test-subscription',
};

const renderModal = (
  apiKey: APIKey = mockApiKey,
  onClose = jest.fn(),
  subscription?: UserSubscription,
) => {
  render(<AccessDetailsModal apiKey={apiKey} onClose={onClose} subscription={subscription} />);
  return onClose;
};

describe('AccessDetailsModal', () => {
  it('renders the API key details and subscription', async () => {
    renderModal();
    expect(await screen.findByTestId('access-details-api-key-name')).toHaveTextContent('my-key');
    expect(screen.getByTestId('access-details-api-key-description')).toHaveTextContent(
      'A test key',
    );
    expect(screen.getByTestId('access-details-subscription')).toHaveTextContent(
      'Test Subscription',
    );
    expect(screen.getByTestId('access-details-expiration')).toHaveTextContent('Jan 15, 2027');
  });

  it('renders access details with a placeholder API key in the usage example', async () => {
    renderModal();
    expect(await screen.findByText('Model A')).toBeVisible();
    expect(screen.getByText('Base URL')).toBeVisible();
    expect(screen.getByLabelText('Subscription ID')).toHaveValue('test-subscription');
    expect(screen.getByText('Model ID')).toBeVisible();
    expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
      'export API_KEY="your_api_key_here"',
    );
    expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
      'https://gateway.example.com/v1/chat/completions',
    );
    expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
      'publishers/test/models/model-a',
    );
  });

  it('updates the model ID and usage example when selecting a different model', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(await screen.findByText('Model A')).toBeVisible();
    expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
      'publishers/test/models/model-a',
    );
    await user.click(screen.getByTestId('access-details-available-models-toggle'));
    await user.click(screen.getByText('Model B'));
    await waitFor(() =>
      expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
        'publishers/test/models/model-b',
      ),
    );
    expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
      'https://gateway.example.com/v1/embeddings',
    );
  });

  it('resolves same-named model refs in different namespaces to distinct models', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(await screen.findByText('Model A')).toBeVisible();
    await user.click(screen.getByTestId('access-details-available-models-toggle'));
    await user.click(screen.getByText('Shared Model B'));
    await waitFor(() =>
      expect(screen.getByTestId('access-details-usage-example')).toHaveTextContent(
        'publishers/team-b/models/shared-model',
      ),
    );
    // The team-a catalog model must never be resolved for the team-b selection.
    expect(screen.getByTestId('access-details-usage-example')).not.toHaveTextContent(
      'publishers/team-a/models/shared-model',
    );
  });

  it('uses the subscription prop when the key is not in the context subscriptions', async () => {
    renderModal(
      { ...mockApiKey, subscription: 'external-subscription' },
      jest.fn(),
      externalSubscription,
    );
    expect(await screen.findByText('Model A')).toBeVisible();
    expect(screen.getByTestId('access-details-subscription')).toHaveTextContent(
      'External Subscription',
    );
    expect(screen.getByLabelText('Subscription ID')).toHaveValue('external-subscription');
  });

  it('fetches the subscription individually when the context does not have it', async () => {
    renderModal({ ...mockApiKey, subscription: 'external-subscription' });
    expect(await screen.findByText('Model A')).toBeVisible();
    expect(mockGetUserSubscription).toHaveBeenCalledWith('external-subscription');
    expect(screen.getByTestId('access-details-subscription')).toHaveTextContent(
      'External Subscription',
    );
    expect(screen.getByLabelText('Subscription ID')).toHaveValue('external-subscription');
  });

  it('shows an error when the individual subscription fetch fails', async () => {
    renderModal({ ...mockApiKey, subscription: 'missing-subscription' });
    expect(await screen.findByTestId('access-details-subscription-error')).toBeVisible();
    expect(screen.getByTestId('access-details-subscription-error')).toHaveTextContent(
      'Subscription not found',
    );
    // The model selector must not render a misleading "No models available" state
    // when the subscription itself failed to load.
    expect(screen.queryByTestId('access-details-available-models-toggle')).not.toBeInTheDocument();
  });

  it('invokes onClose when the Close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();
    await user.click(await screen.findByTestId('access-details-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
