import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockModelRegistry } from '#~/__mocks__/mockModelRegistry';
import { deleteModelRegistryBackend } from '#~/services/modelRegistrySettingsService';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import DeleteModelRegistryModal from '#~/pages/modelRegistrySettings/DeleteModelRegistryModal';

jest.mock('#~/services/modelRegistrySettingsService');
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('DeleteModelRegistryModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should keep registry delete errors in the UI only', async () => {
    const message = 'Private registry delete diagnostic';
    jest.mocked(deleteModelRegistryBackend).mockRejectedValue(new Error(message));
    const registry = mockModelRegistry({});
    const onClose = jest.fn();
    const refresh = jest.fn();
    const user = userEvent.setup();
    render(
      <DeleteModelRegistryModal modelRegistry={registry} onClose={onClose} refresh={refresh} />,
    );
    await user.type(screen.getByTestId('confirm-delete-input'), registry.metadata.name);
    await user.click(screen.getByRole('button', { name: 'Delete model registry' }));
    expect(await screen.findByText(message)).toBeVisible();
    expect(deleteModelRegistryBackend).toHaveBeenCalledWith(registry.metadata.name);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'Model Registry Deleted',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
