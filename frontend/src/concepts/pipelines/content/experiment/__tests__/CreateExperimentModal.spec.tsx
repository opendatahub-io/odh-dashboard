import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import CreateExperimentModal from '#~/concepts/pipelines/content/experiment/CreateExperimentModal';

jest.mock('#~/concepts/pipelines/context', () => ({ usePipelinesAPI: jest.fn() }));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('CreateExperimentModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should preserve the API diagnostic in the UI without tracking the caught object', async () => {
    const message = 'Failed to create private-experiment-name';
    const error = Object.assign(new Error(message), { result: { message } });
    const createExperiment = jest.fn().mockRejectedValue(error);
    jest.mocked(usePipelinesAPI).mockReturnValue({
      apiAvailable: true,
      project: mockProjectK8sResource({}),
      api: { createExperiment },
    } as unknown as ReturnType<typeof usePipelinesAPI>);
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<CreateExperimentModal onClose={onClose} />);
    await user.type(screen.getByRole('textbox', { name: /Run group name/ }), 'Test group');
    await user.click(screen.getByRole('button', { name: 'Create run group' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(createExperiment).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'Run Group Created',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
  });
});
