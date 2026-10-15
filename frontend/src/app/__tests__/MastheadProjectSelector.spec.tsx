import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import type { ProjectIdentity } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import useNotification from '#~/utilities/useNotification';
import MastheadProjectSelector from '#~/app/MastheadProjectSelector';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({ useAccessReview: jest.fn() }));
jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  useWorkingProject: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/components/projectSelector/WorkingProjectSelector', () => ({
  __esModule: true,
  default: ({
    onProjectSelected,
    onCreateProject,
  }: {
    onProjectSelected: (project: { name: string; displayName?: string }) => void;
    onCreateProject?: (isEmpty: boolean) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => onProjectSelected({ name: 'project-x', displayName: 'Project X' })}
      >
        Select project
      </button>
      {onCreateProject && (
        <button type="button" onClick={() => onCreateProject(true)}>
          Create project
        </button>
      )}
    </>
  ),
}));
jest.mock('#~/pages/projects/screens/projects/ManageProjectModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: (name?: string) => void }) => (
    <>
      <button type="button" onClick={() => onClose('new-project')}>
        Finish creating project
      </button>
      <button type="button" onClick={() => onClose()}>
        Cancel creating project
      </button>
    </>
  ),
}));
jest.mock('#~/pages/projects/screens/projects/EmptyProjects', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('#~/utilities/useNotification', () => ({ __esModule: true, default: jest.fn() }));

describe('MastheadProjectSelector', () => {
  const info = jest.fn();
  const selectProject = jest.fn();

  const setWorkingProjects = (projects: ProjectIdentity[]) => {
    jest.mocked(useWorkingProject).mockReturnValue({
      status: projects.length ? 'listed' : 'empty-list',
      projects,
      activeProject: null,
      selectProject,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccessReview).mockReturnValue([false, true]);
    setWorkingProjects([]);
    jest.mocked(useNotification).mockReturnValue({
      info,
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    });
  });

  it('should show an info notification with the selected project display name', () => {
    render(<MastheadProjectSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Select project' }));

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('Working project updated', expect.anything());
    const message = info.mock.calls[0][1] as React.ReactNode;
    render(<>{message}</>);
    expect(screen.getByText('Project X')).toBeInTheDocument();
    expect(screen.getByText('Project X').closest('strong')).toBeInTheDocument();
    expect(screen.getByText(/You're now working in/)).toBeInTheDocument();
  });

  it('should select a created project only after it appears in the current provider list', () => {
    jest.mocked(useAccessReview).mockReturnValue([true, true]);
    const { rerender } = render(<MastheadProjectSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish creating project' }));

    expect(selectProject).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();

    setWorkingProjects([{ name: 'new-project', displayName: 'New Project' }]);
    rerender(<MastheadProjectSelector />);

    expect(selectProject).toHaveBeenCalledTimes(1);
    expect(selectProject).toHaveBeenCalledWith({ name: 'new-project', displayName: 'New Project' });
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('Working project updated', expect.anything());
    render(<>{info.mock.calls[0][1] as React.ReactNode}</>);
    expect(screen.getByText('New Project').tagName).toBe('STRONG');

    rerender(<MastheadProjectSelector />);
    expect(selectProject).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('should not select or notify when project creation is cancelled', () => {
    jest.mocked(useAccessReview).mockReturnValue([true, true]);
    const { rerender } = render(<MastheadProjectSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel creating project' }));
    setWorkingProjects([{ name: 'new-project' }]);
    rerender(<MastheadProjectSelector />);

    expect(selectProject).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });
});
