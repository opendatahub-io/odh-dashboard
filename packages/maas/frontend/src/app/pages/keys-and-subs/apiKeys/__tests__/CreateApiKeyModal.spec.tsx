/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createApiKey } from '~/app/api/api-keys';
import { ApiKeyCreateInitiatedFrom } from '~/app/types/event-tracking';
import type { UserSubscription } from '~/app/types/subscriptions';
import CreateApiKeyModal from '~/app/pages/keys-and-subs/apiKeys/CreateApiKeyModal';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

jest.mock('~/app/api/api-keys');
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
    const trackEvent = jest.fn();
    const user = userEvent.setup();
    const subscription: UserSubscription = {
      subscription_id_header: 'test-subscription',
      subscription_description: 'Test',
      inference_priority: 1,
      model_refs: [],
    };
    render(
      <TrackingProvider trackEvent={trackEvent}>
        <CreateApiKeyModal
          onClose={onClose}
          initialSubscription={subscription}
          initiatedFrom={ApiKeyCreateInitiatedFrom.SUBSCRIPTION_DETAIL}
          maxExpirationDays={365}
        />
      </TrackingProvider>,
    );
    await user.type(screen.getByTestId('api-key-name-input'), 'test-key');
    await user.click(screen.getByTestId('api-key-expiration-mode-toggle'));
    await user.click(screen.getByTestId('api-key-expiration-mode-max'));
    await user.click(screen.getByTestId('submit-create-api-key-button'));
    expect(await screen.findByText(message)).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      'API Key Created',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
  });
});
