import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { deleteProject } from '#~/api';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import DeleteProjectModal from '#~/pages/projects/screens/projects/DeleteProjectModal';

jest.mock('#~/api', () => ({ deleteProject: jest.fn() }));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('DeleteProjectModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should preserve the Kubernetes diagnostic in the UI and track only its status code', async () => {
    const message = 'Forbidden: cannot delete private-project-name';
    jest.mocked(deleteProject).mockRejectedValue(
      new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        reason: 'Forbidden',
        code: 403,
        message,
      }),
    );
    const project = mockProjectK8sResource({ displayName: 'Test project' });
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<DeleteProjectModal deleteData={project} onClose={onClose} />);
    await user.type(screen.getByTestId('delete-modal-input'), 'Test project');
    await user.click(screen.getByRole('button', { name: 'Delete project' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(deleteProject).toHaveBeenCalledWith(project.metadata.name);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      'Project Deleted',
      expect.objectContaining({ success: false, error: 'k8s_403' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
  });
});
