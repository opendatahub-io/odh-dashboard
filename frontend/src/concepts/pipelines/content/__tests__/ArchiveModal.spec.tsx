import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { ArchiveModal } from '#~/concepts/pipelines/content/ArchiveModal';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: () => ({ refreshAllAPI: jest.fn() }),
}));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('ArchiveModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each<'runs' | 'experiments'>(['runs', 'experiments'])(
    'should retain %s failure details in the UI only',
    async (what) => {
      const message = 'Private pipeline archive diagnostic';
      const onSubmit = jest.fn().mockRejectedValue(new Error(message));
      const onCancel = jest.fn();
      const user = userEvent.setup();
      render(
        <ArchiveModal
          whatToArchive={what}
          confirmMessage="confirm"
          title="Archive"
          alertTitle="Failed"
          testId="modal"
          onSubmit={onSubmit}
          onCancel={onCancel}
        >
          Test resource
        </ArchiveModal>,
      );
      await user.type(screen.getByTestId('confirm-archive-input'), 'confirm');
      await user.click(screen.getByRole('button', { name: 'Archive' }));
      expect(await screen.findByText(message)).toBeVisible();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(fireFormTrackingEvent).toHaveBeenCalledWith(
        what === 'runs' ? 'Pipeline Runs Archived' : 'Pipeline Experiment Archived',
        expect.objectContaining({ success: false, error: 'unknown_error' }),
      );
      expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
      expect(onCancel).not.toHaveBeenCalled();
    },
  );
});
