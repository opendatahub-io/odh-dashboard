import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router-dom';
import { useAccessReview } from '#~/api';
import ModelServingNoProjects from '#~/pages/modelServing/screens/global/ModelServingNoProjects';

jest.mock('#~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/projects/NewProjectButton', () => {
  const MockNewProjectButton: React.FC<{ onProjectCreated?: (name: string) => void }> = ({
    onProjectCreated,
  }) => (
    <button data-testid="create-project" onClick={() => onProjectCreated?.('test-project')}>
      Create project
    </button>
  );
  return { __esModule: true, default: MockNewProjectButton };
});

const useAccessReviewMock = jest.mocked(useAccessReview);
const useNavigateMock = jest.mocked(useNavigate);

describe('ModelServingNoProjects', () => {
  let navigateMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    useNavigateMock.mockReturnValue(navigateMock);
  });

  it('should show create project button when user has permission', () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    render(<ModelServingNoProjects />);

    expect(screen.getByTestId('create-project')).toBeInTheDocument();
    expect(screen.queryByText("Who's my administrator?")).not.toBeInTheDocument();
  });

  it('should navigate to model serving route when project is created', () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    render(<ModelServingNoProjects />);

    fireEvent.click(screen.getByTestId('create-project'));
    expect(navigateMock).toHaveBeenCalledWith('/ai-hub/deployments/test-project');
  });

  it('should show administrator help when user lacks permission', () => {
    useAccessReviewMock.mockReturnValue([false, true]);
    render(<ModelServingNoProjects />);

    expect(screen.queryByTestId('create-project')).not.toBeInTheDocument();
    expect(screen.getByText("Who's my administrator?")).toBeInTheDocument();
    expect(
      screen.getByText(/To request a project, contact your administrator\./),
    ).toBeInTheDocument();
  });

  it('should not show button or administrator help while RBAC is loading', () => {
    useAccessReviewMock.mockReturnValue([false, false]);
    render(<ModelServingNoProjects />);

    expect(screen.queryByTestId('create-project')).not.toBeInTheDocument();
    expect(screen.queryByText("Who's my administrator?")).not.toBeInTheDocument();
  });
});
