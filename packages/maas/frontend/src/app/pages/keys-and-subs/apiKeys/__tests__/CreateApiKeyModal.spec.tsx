/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { createApiKey } from '~/app/api/api-keys';
import { getMaaSModelsList } from '~/app/api/maas-models';
import { ApiKeyCreateInitiatedFrom } from '~/app/types/event-tracking';
import type { UserSubscription } from '~/app/types/subscriptions';
import type { MaaSModel } from '~/app/types/maas-model';
import CreateApiKeyModal from '~/app/pages/keys-and-subs/apiKeys/CreateApiKeyModal';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));
jest.mock('~/app/api/api-keys');
jest.mock('~/app/api/maas-models');
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: jest.fn() }),
}));
jest.mock('~/app/shared/MaasModelsSection', () => ({ __esModule: true, default: () => null }));
jest.mock('~/app/context/KeysAndSubsContext', () => ({
  useKeysAndSubsContext: () => ({
    subscriptions: [],
    subscriptionsLoaded: true,
    gatewayUrl: 'https://example.invalid',
  }),
}));
describe('CreateApiKeyModal', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should retain the diagnostic in the UI without tracking it', async () => {
    const message = 'Private API key diagnostic';
    const request = jest.fn().mockRejectedValue(new Error(message));
    jest.mocked(createApiKey).mockReturnValue(request);
    const onClose = jest.fn();
    const user = userEvent.setup();
    const subscription: UserSubscription = {
      subscription_id_header: 'test-subscription',
      subscription_description: 'Test',
      inference_priority: 1,
      model_refs: [],
    };
    render(
      <CreateApiKeyModal
        onClose={onClose}
        initialSubscription={subscription}
        initiatedFrom={ApiKeyCreateInitiatedFrom.SUBSCRIPTION_DETAIL}
        maxExpirationDays={365}
      />,
    );
    await user.type(screen.getByTestId('api-key-name-input'), 'test-key');
    await user.click(screen.getByTestId('api-key-expiration-mode-toggle'));
    await user.click(screen.getByTestId('api-key-expiration-mode-max'));
    await user.click(screen.getByTestId('submit-create-api-key-button'));
    expect(await screen.findByText(message)).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'API Key Created',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('Access details usage example', () => {
    const subscription: UserSubscription = {
      subscription_id_header: 'test-subscription',
      subscription_description: 'Test',
      inference_priority: 1,
      model_refs: [{ name: 'test-model', model_name: 'test-model' }],
    };
    const maasModel = (modelCapabilities?: string[]): MaaSModel => ({
      id: 'test-model',
      object: 'model',
      created: 1714521600,
      owned_by: 'llm/test-model',
      ready: true,
      url: 'https://maas.example.com/llm/test-model',
      modelDetails: modelCapabilities ? { modelCapabilities } : undefined,
    });

    const createKeyAndOpenAccessDetails = async (modelCapabilities?: string[]) => {
      jest.mocked(createApiKey).mockReturnValue(
        jest.fn().mockResolvedValue({
          key: 'sk-created-key',
          keyPrefix: 'sk-cre',
          id: 'key-id',
          name: 'test-key',
          createdAt: '2026-01-01T00:00:00Z',
        }),
      );
      jest
        .mocked(getMaaSModelsList)
        .mockReturnValue(jest.fn().mockResolvedValue([maasModel(modelCapabilities)]));
      const user = userEvent.setup();
      render(
        <CreateApiKeyModal
          onClose={jest.fn()}
          initialSubscription={subscription}
          initiatedFrom={ApiKeyCreateInitiatedFrom.SUBSCRIPTION_DETAIL}
          maxExpirationDays={365}
        />,
      );
      await user.type(screen.getByTestId('api-key-name-input'), 'test-key');
      await user.click(screen.getByTestId('api-key-expiration-mode-toggle'));
      await user.click(screen.getByTestId('api-key-expiration-mode-max'));
      await user.click(screen.getByTestId('submit-create-api-key-button'));
      await user.click(await screen.findByRole('button', { name: 'Access details' }));
    };

    it.each<[string, string[] | undefined, string, string]>([
      ['an unlabelled model', undefined, '/v1/chat/completions', '"messages":'],
      ['a Chat model', ['Chat'], '/v1/chat/completions', '"messages":'],
      [
        'a Chat and Text completion model',
        ['Chat', 'Text completion'],
        '/v1/chat/completions',
        '"messages":',
      ],
      [
        'a Vision and Text completion model',
        ['Text completion', 'Vision'],
        '/v1/chat/completions',
        '"messages":',
      ],
      [
        'a completion-only model',
        ['Text completion'],
        '/v1/completions',
        '"prompt":"Hello, world!"',
      ],
    ])(
      'should show the matching endpoint for %s',
      async (_label, modelCapabilities, endpointPath, bodyFragment) => {
        await createKeyAndOpenAccessDetails(modelCapabilities);
        const example = await screen.findByTestId('api-key-usage-example');
        expect(example).toHaveTextContent(`https://maas.example.com/llm/test-model${endpointPath}`);
        expect(example).toHaveTextContent(bodyFragment);
        expect(screen.getByTestId('api-key-endpoint-compatibility-alert')).toHaveTextContent(
          `standard OpenAI-compatible ${endpointPath} endpoint.`,
        );
      },
    );
  });
});
