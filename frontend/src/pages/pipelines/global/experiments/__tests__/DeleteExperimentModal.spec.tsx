import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { buildMockExperimentKF } from '#~/__mocks__/mockExperimentKF';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import DeleteExperimentModal from '#~/pages/pipelines/global/experiments/DeleteExperimentModal';

jest.mock('#~/concepts/pipelines/context', () => ({ usePipelinesAPI: jest.fn() }));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('DeleteExperimentModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should preserve the API diagnostic in the UI without tracking the caught object', async () => {
    const message = 'Failed to delete private-experiment-name';
    const error = Object.assign(new Error(message), { result: { message } });
    const deleteExperiment = jest.fn().mockRejectedValue(error);
    jest.mocked(usePipelinesAPI).mockReturnValue({
      api: { deleteExperiment },
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof usePipelinesAPI>);
    const experiment = buildMockExperimentKF();
    const onCancel = jest.fn();
    const user = userEvent.setup();

    render(<DeleteExperimentModal experiment={experiment} onCancel={onCancel} />);
    await user.type(screen.getByTestId('delete-modal-input'), experiment.display_name);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(deleteExperiment).toHaveBeenCalledWith({}, experiment.experiment_id);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'Experiment Deleted',
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: false,
        error: 'unknown_error',
      }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
