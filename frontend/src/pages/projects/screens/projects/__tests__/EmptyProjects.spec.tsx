import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyProjects from '#~/pages/projects/screens/projects/EmptyProjects';
import { useUser } from '#~/redux/selectors';

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  ...jest.requireActual('#~/redux/selectors'),
  useUser: jest.fn(),
  useClusterInfo: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const useUserMock = jest.mocked(useUser);
useUserMock.mockReturnValue({
  username: 'test-user',
  userID: '1234',
  isAdmin: false,
  isAllowed: true,
  userLoading: false,
  userError: null,
});

describe('EmptyProjects', () => {
  it('should show the create project button when allowed to create projects', async () => {
    render(<EmptyProjects allowCreate />);
    const createProject = await screen.findByTestId('create-project');
    expect(createProject).toBeEnabled();
    expect(createProject).not.toHaveAttribute('href');
    const bodyText = await screen.findByTestId('projects-empty-body-text');
    expect(bodyText).toHaveTextContent(
      'Projects allow you and your team to organize and collaborate on resources within separate namespaces.',
    );
    expect(bodyText).not.toHaveTextContent('To request a project, contact your administrator.');
  });
  it('should call onCreateProject when the selector create action is clicked', () => {
    const onCreateProject = jest.fn();

    render(<EmptyProjects allowCreate onCreateProject={onCreateProject} />);

    fireEvent.click(screen.getByTestId('create-project'));

    expect(onCreateProject).toHaveBeenCalledTimes(1);
    expect(onCreateProject).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should call onCancel when the selector cancel action is clicked', () => {
    const onCancel = jest.fn();

    render(<EmptyProjects allowCreate onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('cancel-create-project'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not show the cancel action without an onCancel callback', () => {
    render(<EmptyProjects allowCreate />);

    expect(screen.queryByTestId('cancel-create-project')).not.toBeInTheDocument();
  });

  it('should show the who is my admin help when not allowed to create projects', async () => {
    render(<EmptyProjects allowCreate={false} />);
    const bodyText = await screen.findByTestId('projects-empty-body-text');
    expect(bodyText).toHaveTextContent(
      'Projects allow you and your team to organize and collaborate on resources within separate namespaces. To request a project, contact your administrator.',
    );
    const adminHelpButton = await screen.findByTestId('projects-empty-admin-help');
    act(() => adminHelpButton.click());
    const helpContent = await screen.findByTestId('projects-empty-admin-help-content');
    expect(helpContent).toBeVisible();
  });

  it('should not expose creation or cancel actions without create permission', () => {
    const onCreateProject = jest.fn();
    const onCancel = jest.fn();
    render(
      <EmptyProjects allowCreate={false} onCreateProject={onCreateProject} onCancel={onCancel} />,
    );
    expect(screen.getByRole('heading', { name: 'Start by requesting a project' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'no projects' })).toBeVisible();
    expect(screen.queryByTestId('create-project')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-create-project')).not.toBeInTheDocument();
    expect(onCreateProject).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
