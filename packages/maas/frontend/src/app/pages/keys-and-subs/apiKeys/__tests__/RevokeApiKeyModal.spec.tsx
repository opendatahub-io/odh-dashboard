/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { revokeApiKey } from '~/app/api/api-keys';
import { ApiKeyRevokeInitiatedFrom } from '~/app/types/event-tracking';
import type { APIKey } from '~/app/types/api-key';
import RevokeApiKeyModal from '~/app/pages/keys-and-subs/apiKeys/RevokeApiKeyModal';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));
jest.mock('~/app/api/api-keys');
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: jest.fn() }),
}));

describe('RevokeApiKeyModal', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should retain the diagnostic in the UI without tracking it', async () => {
    const message = 'Private API key diagnostic';
    const request = jest.fn().mockRejectedValue(new Error(message));
    jest.mocked(revokeApiKey).mockReturnValue(request);
    const onClose = jest.fn();
    const user = userEvent.setup();
    const apiKey: APIKey = {
      id: 'test-key-id',
      name: 'test-key',
      status: 'active',
      creationDate: '2026-01-01T00:00:00Z',
    };
    render(
      <RevokeApiKeyModal
        apiKey={apiKey}
        onClose={onClose}
        initiatedFrom={ApiKeyRevokeInitiatedFrom.API_KEYS_TABLE}
      />,
    );
    await user.type(screen.getByTestId('delete-modal-input'), apiKey.name);
    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByText(message)).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'API Key Revoked',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
  });
});
