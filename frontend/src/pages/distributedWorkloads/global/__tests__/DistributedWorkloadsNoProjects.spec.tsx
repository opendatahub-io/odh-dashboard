import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccessReview } from '#~/api';
import DistributedWorkloadsNoProjects from '#~/pages/distributedWorkloads/global/DistributedWorkloadsNoProjects';

jest.mock('#~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const useAccessReviewMock = jest.mocked(useAccessReview);

describe('DistributedWorkloadsNoProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show create project button when user has permission', () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    render(<DistributedWorkloadsNoProjects />);

    expect(screen.getByTestId('create-project')).toBeInTheDocument();
    expect(screen.queryByText("Who's my administrator?")).not.toBeInTheDocument();
  });

  it('should show administrator help when user lacks permission', () => {
    useAccessReviewMock.mockReturnValue([false, true]);
    render(<DistributedWorkloadsNoProjects />);

    expect(screen.queryByTestId('create-project')).not.toBeInTheDocument();
    expect(screen.getByText("Who's my administrator?")).toBeInTheDocument();
    expect(
      screen.getByText(/To request a project, contact your administrator\./),
    ).toBeInTheDocument();
  });

  it('should not show button or administrator help while RBAC is loading', () => {
    useAccessReviewMock.mockReturnValue([false, false]);
    render(<DistributedWorkloadsNoProjects />);

    expect(screen.queryByTestId('create-project')).not.toBeInTheDocument();
    expect(screen.queryByText("Who's my administrator?")).not.toBeInTheDocument();
  });
});
