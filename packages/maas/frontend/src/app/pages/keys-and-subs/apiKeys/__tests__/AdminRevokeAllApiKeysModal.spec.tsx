/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { bulkRevokeApiKeys, searchApiKeys } from '~/app/api/api-keys';
import type { APIKey } from '~/app/types/api-key';
import AdminRevokeAllApiKeysModal from '~/app/pages/keys-and-subs/apiKeys/AdminRevokeAllApiKeysModal';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));
jest.mock('~/app/api/api-keys');
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: jest.fn() }),
}));

describe('AdminRevokeAllApiKeysModal', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should retain the diagnostic in the UI without tracking it', async () => {
    const message = 'Private API key diagnostic';
    const request = jest.fn().mockRejectedValue(new Error(message));
    jest.mocked(bulkRevokeApiKeys).mockReturnValue(request);
    const onClose = jest.fn();
    const user = userEvent.setup();
    const apiKey: APIKey = {
      id: 'test-key-id',
      name: 'test-key',
      status: 'active',
      creationDate: '2026-01-01T00:00:00Z',
    };
    jest.mocked(searchApiKeys).mockReturnValue(jest.fn().mockResolvedValue({ data: [apiKey] }));
    render(<AdminRevokeAllApiKeysModal onClose={onClose} />);
    await user.type(screen.getByTestId('admin-revoke-username-input'), 'test-user');
    await user.click(screen.getByTestId('admin-revoke-search-button'));
    expect(await screen.findByTestId('admin-revoke-keys-button')).toBeEnabled();
    await user.click(screen.getByTestId('admin-revoke-keys-button'));
    expect(await screen.findByText(message)).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'API Keys Bulk Revoked',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
  });
});
