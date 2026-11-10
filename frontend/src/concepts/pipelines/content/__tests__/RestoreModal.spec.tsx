import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { RestoreModal } from '#~/concepts/pipelines/content/RestoreModal';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: () => ({ refreshAllAPI: jest.fn() }),
}));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('RestoreModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each<'run' | 'experiment'>(['run', 'experiment'])(
    'should retain %s failure details in the UI only',
    async (what) => {
      const message = 'Private pipeline restore diagnostic';
      const onSubmit = jest.fn().mockRejectedValue(new Error(message));
      const onCancel = jest.fn();
      const user = userEvent.setup();
      render(
        <RestoreModal
          what={what}
          title="Restore"
          alertTitle="Failed"
          testId="modal"
          onSubmit={onSubmit}
          onCancel={onCancel}
        >
          Test resource
        </RestoreModal>,
      );

      await user.click(screen.getByRole('button', { name: 'Restore' }));
      expect(await screen.findByText(message)).toBeVisible();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(fireFormTrackingEvent).toHaveBeenCalledWith(
        what === 'run' ? 'Archived Pipeline Run Restored' : 'Archived Experiment Restored',
        expect.objectContaining({ success: false, error: 'unknown_error' }),
      );
      expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
      expect(onCancel).not.toHaveBeenCalled();
    },
  );
});
