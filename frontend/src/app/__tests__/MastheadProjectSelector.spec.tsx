import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
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
  }: {
    onProjectSelected: (project: { name: string; displayName?: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onProjectSelected({ name: 'project-x', displayName: 'Project X' })}
    >
      Select project
    </button>
  ),
}));
jest.mock('#~/pages/projects/screens/projects/EmptyProjects', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('#~/utilities/useNotification', () => ({ __esModule: true, default: jest.fn() }));

describe('MastheadProjectSelector', () => {
  const info = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccessReview).mockReturnValue([false, true]);
    jest.mocked(useWorkingProject).mockReturnValue({
      status: 'listed',
      projects: [],
      activeProject: null,
      selectProject: jest.fn(),
    });
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
});
