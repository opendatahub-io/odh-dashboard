/* eslint-disable camelcase */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { bulkRevokeApiKeys } from '~/app/api/api-keys';

import RevokeAllApiKeysModal from '~/app/pages/keys-and-subs/apiKeys/RevokeAllApiKeysModal';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));
jest.mock('~/app/api/api-keys');
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: jest.fn() }),
}));
jest.mock('~/app/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({ userId: 'test-user' }),
}));
describe('RevokeAllApiKeysModal', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should retain the diagnostic in the UI without tracking it', async () => {
    const message = 'Private API key diagnostic';
    const request = jest.fn().mockRejectedValue(new Error(message));
    jest.mocked(bulkRevokeApiKeys).mockReturnValue(request);
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<RevokeAllApiKeysModal onClose={onClose} keyCount={1} />);
    await user.type(screen.getByTestId('revoke-confirmation-input'), 'test-user');
    await user.click(screen.getByTestId('revoke-keys-button'));
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
