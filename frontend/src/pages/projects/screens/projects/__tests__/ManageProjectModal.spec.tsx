import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { createProject, updateProject } from '#~/api';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import ManageProjectModal from '#~/pages/projects/screens/projects/ManageProjectModal';

jest.mock('#~/api', () => ({ createProject: jest.fn(), updateProject: jest.fn() }));
jest.mock('#~/redux/selectors', () => ({ useUser: () => ({ username: 'test-user' }) }));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

describe('ManageProjectModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([false, true])(
    'should preserve diagnostics without tracking raw errors (edit=%s)',
    async (edit) => {
      const message = 'Private project diagnostic';
      const api = edit ? updateProject : createProject;
      jest.mocked(api).mockRejectedValue(new Error(message));
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(
        <ManageProjectModal
          editProjectData={edit ? mockProjectK8sResource({}) : undefined}
          onClose={onClose}
        />,
      );
      if (!edit) {
        await user.type(screen.getByTestId('manage-project-modal-name'), 'Test project');
      }
      await user.click(screen.getByRole('button', { name: edit ? 'Update' : 'Create' }));
      expect(await screen.findByText(message)).toBeVisible();
      expect(api).toHaveBeenCalledTimes(1);
      expect(fireFormTrackingEvent).toHaveBeenCalledWith(
        edit ? 'Project Edited' : 'NewProject Created',
        expect.objectContaining({ success: false, error: 'unknown_error' }),
      );
      expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
      expect(onClose).not.toHaveBeenCalled();
    },
  );
});
