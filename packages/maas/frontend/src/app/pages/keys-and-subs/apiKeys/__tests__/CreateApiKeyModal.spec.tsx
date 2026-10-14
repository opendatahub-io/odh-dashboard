/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { createApiKey } from '~/app/api/api-keys';
import { ApiKeyCreateInitiatedFrom } from '~/app/types/event-tracking';
import type { UserSubscription } from '~/app/types/subscriptions';
import CreateApiKeyModal from '~/app/pages/keys-and-subs/apiKeys/CreateApiKeyModal';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));
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
    const user = userEvent.setup();
    const subscription: UserSubscription = {
      subscription_id_header: 'test-subscription',
      subscription_description: 'Test',
      priority: 1,
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
});
